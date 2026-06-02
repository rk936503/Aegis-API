// ─── Environment overrides — must happen before any module loads ──────────────
// dotenv.config() in app.js will NOT override vars already set here
// (dotenv never overwrites existing process.env values by default)
process.env.DATABASE_URL  = 'postgresql://postgres:password@localhost:5432/aegis_auth';
process.env.REDIS_URL     = 'redis://localhost:6379';
process.env.JWT_SECRET    = 'supersecret';
process.env.JWT_REFRESH_SECRET = 'refreshsecret';

// Mock ioredis with an in-memory implementation — no real Redis needed for tests
jest.mock('ioredis', () => require('ioredis-mock'));

const request = require('supertest');
const app     = require('../app');
const prisma  = require('../db/prisma');

// Clean DB before every test so tests don't interfere with each other
beforeEach(async () => {
    await prisma.user.deleteMany();
});

// Disconnect Prisma after all tests — prevents Jest open handle warning
afterAll(async () => {
    await prisma.$disconnect();
});

// ─── POST /register ───────────────────────────────────────────────────────────

describe('POST /register', () => {
    it('should create a new user (201)', async () => {
        const res = await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('User registered');
    });

    it('should reject duplicate username (400)', async () => {
        await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123' });

        const res = await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('User Already Exists');
    });

    it('should reject missing username (400)', async () => {
        const res = await request(app)
            .post('/register')
            .send({ password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/required/i);
    });

    it('should reject missing password (400)', async () => {
        const res = await request(app)
            .post('/register')
            .send({ username: 'testuser' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/required/i);
    });

    it('should reject short password (400)', async () => {
        const res = await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/6 characters/i);
    });
});

// ─── POST /login ──────────────────────────────────────────────────────────────

describe('POST /login', () => {
    beforeEach(async () => {
        await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123' });
    });

    it('should return accessToken and refreshToken for valid credentials (200)', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject wrong password (401)', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'testuser', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid Credentials');
    });

    it('should reject non-existent user (401)', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'nobody', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid Credentials');
    });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

describe('POST /refresh', () => {
    let refreshToken;

    beforeEach(async () => {
        await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123' });

        const res = await request(app)
            .post('/login')
            .send({ username: 'testuser', password: 'password123' });

        refreshToken = res.body.refreshToken;
    });

    it('should return a new accessToken for a valid refresh token (200)', async () => {
        const res = await request(app)
            .post('/refresh')
            .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
    });

    it('should reject an invalid refresh token (401)', async () => {
        const res = await request(app)
            .post('/refresh')
            .send({ refreshToken: 'invalid.token.here' });

        expect(res.status).toBe(401);
    });

    it('should reject when no refresh token provided (400)', async () => {
        const res = await request(app)
            .post('/refresh')
            .send({});

        expect(res.status).toBe(400);
    });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

describe('POST /logout', () => {
    let refreshToken;

    beforeEach(async () => {
        await request(app)
            .post('/register')
            .send({ username: 'testuser', password: 'password123' });

        const res = await request(app)
            .post('/login')
            .send({ username: 'testuser', password: 'password123' });

        refreshToken = res.body.refreshToken;
    });

    it('should blacklist the refresh token and return 200', async () => {
        const logoutRes = await request(app)
            .post('/logout')
            .send({ refreshToken });

        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.message).toMatch(/logged out/i);
    });

    it('should reject blacklisted token on next /refresh call (401)', async () => {
        await request(app).post('/logout').send({ refreshToken });

        const res = await request(app)
            .post('/refresh')
            .send({ refreshToken });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/revoked/i);
    });
});
