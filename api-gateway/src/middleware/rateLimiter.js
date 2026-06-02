const redis = require('../config/redis');
const { rateLimitedTotal } = require('../utils/metrics');

const WINDOW_SIZE = 60; // seconds

// Role-based request limits per minute
const ROLE_LIMITS = {
    admin:   100,
    premium: 50,
    user:    10,
};
const DEFAULT_LIMIT = 5; // unauthenticated requests (e.g. /auth routes)

module.exports = async (req, res, next) => {
    // Skip monitoring endpoints — never rate-limit Prometheus scraping
    if (req.originalUrl === '/metrics' || req.originalUrl === '/health') {
        return next();
    }

    try {
        const ip  = req.ip;
        const now = Date.now();

        // Role-aware key and limit:
        // — Authenticated (req.user set by authMiddleware): key by username, limit by role
        // — Unauthenticated (/auth routes): key by IP, use default limit
        let MAX_REQUESTS, key;
        if (req.user) {
            MAX_REQUESTS = ROLE_LIMITS[req.user.role] ?? ROLE_LIMITS.user;
            key = `rate_limit:user:${req.user.username}`;
        } else {
            MAX_REQUESTS = DEFAULT_LIMIT;
            key = `rate_limit:ip:${ip}`;
        }

        // Sliding window — remove timestamps outside the current window
        await redis.zremrangebyscore(key, 0, now - WINDOW_SIZE * 1000);
        const count = await redis.zcard(key);

        // Set X-RateLimit headers on every response (industry standard — same as GitHub API)
        res.setHeader('X-RateLimit-Limit',     MAX_REQUESTS);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - count - 1));
        res.setHeader('X-RateLimit-Reset',     Math.ceil((now + WINDOW_SIZE * 1000) / 1000));

        if (count >= MAX_REQUESTS) {
            rateLimitedTotal.inc({ ip }); // Track rate-limited requests in Prometheus
            return res.status(429).json({
                error: 'Too many requests. Try again later.',
            });
        }

        await redis.zadd(key, now, now.toString());
        await redis.expire(key, WINDOW_SIZE);

        next();

    } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Fail open — don't block requests if Redis is down
    }
};