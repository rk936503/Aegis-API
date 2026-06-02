// Mock ioredis with an in-memory implementation — no real Redis needed
jest.mock('ioredis', () => require('ioredis-mock'));

const request     = require('supertest');
const express     = require('express');
const rateLimiter = require('../src/middleware/rateLimiter');
const redis       = require('../src/config/redis');

// Flush all Redis keys before each test — ioredis-mock is shared across tests
// so a "flood" test would pollute the next test's request count without this
beforeEach(async () => {
    await redis.flushall();
});

// Build a minimal Express app that only has the rate limiter
function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(rateLimiter);

    app.get('/test',    (req, res) => res.json({ ok: true }));
    app.get('/health',  (req, res) => res.json({ status: 'OK' }));
    app.get('/metrics', (req, res) => res.send('metrics'));

    return app;
}

describe('Rate Limiter Middleware', () => {

    it('should allow requests under the limit', async () => {
        const app = buildApp();

        const res = await request(app).get('/test');

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });

    it('should return 429 after exceeding the limit', async () => {
        const app = buildApp();

        // Fire DEFAULT_LIMIT (5) requests to fill the window
        for (let i = 0; i < 5; i++) {
            await request(app).get('/test');
        }

        // The 6th request should be rate limited
        const res = await request(app).get('/test');

        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/too many requests/i);
    });

    it('should skip rate limiting for /health', async () => {
        const app = buildApp();

        // Flood past the limit
        for (let i = 0; i < 10; i++) {
            await request(app).get('/test');
        }

        // /health should still return 200
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
    });

    it('should skip rate limiting for /metrics', async () => {
        const app = buildApp();

        // Flood past the limit
        for (let i = 0; i < 10; i++) {
            await request(app).get('/test');
        }

        // /metrics should still return 200
        const res = await request(app).get('/metrics');
        expect(res.status).toBe(200);
    });

    it('should include X-RateLimit headers on every response', async () => {
        const app = buildApp();

        const res = await request(app).get('/test');

        expect(res.headers).toHaveProperty('x-ratelimit-limit');
        expect(res.headers).toHaveProperty('x-ratelimit-remaining');
        expect(res.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should decrease X-RateLimit-Remaining with each request', async () => {
        const app = buildApp();

        const res1 = await request(app).get('/test');
        const res2 = await request(app).get('/test');

        const remaining1 = parseInt(res1.headers['x-ratelimit-remaining']);
        const remaining2 = parseInt(res2.headers['x-ratelimit-remaining']);

        expect(remaining2).toBeLessThan(remaining1);
    });

    it('should use role-based limit when req.user is set', async () => {
        const app = express();
        app.use(express.json());

        // Simulate auth middleware that attaches a user with 'admin' role
        app.use((req, res, next) => {
            req.user = { username: 'adminuser', role: 'admin' };
            next();
        });

        app.use(rateLimiter);
        app.get('/test', (req, res) => res.json({ ok: true }));

        // Admin limit is 100 — fire 10 requests, all should pass
        for (let i = 0; i < 10; i++) {
            const res = await request(app).get('/test');
            expect(res.status).toBe(200);
        }

        // X-RateLimit-Limit should reflect admin limit
        const res = await request(app).get('/test');
        expect(res.headers['x-ratelimit-limit']).toBe('100');
    });
});
