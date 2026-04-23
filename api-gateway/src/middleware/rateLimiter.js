const redis = require('../config/redis');
const WINDOW_SIZE = 60;
const MAX_REQUESTS = 5;

module.exports = async(req, res, next) => {
    try {
        const ip = req.ip;
        const key = `rate_limit:${ip}`;
        const now = Date.now();

        await redis.zremrangebyscore(key, 0, now - WINDOW_SIZE * 1000);

        const count = await redis.zcard(key);

        if(count >= MAX_REQUESTS){
            return res.status(429).json({
                error: 'Too many requests. Try again later.',
            });
        }

        await redis.zadd(key, now, now.toString());

        await redis.expire(key, WINDOW_SIZE);
        
        next();

    } catch (error) {
        console.error('Rate limiter error: ',error);
        next();
    }
}