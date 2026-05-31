require('dotenv').config();
const express = require('express');

const loggerMiddleware = require('./middleware/logger');
const metricsMiddleware = require('./middleware/metrics');
const logger = require('./utils/logger');

const { userServiceHandler, orderServiceHandler } = require('./routes/proxyRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(loggerMiddleware);
app.use(metricsMiddleware);

// Public routes — no auth required
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

const { client } = require('./utils/metrics');

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Protected routes — auth then rate limiter then circuit-breaker proxy
app.use('/api/users',  authMiddleware, rateLimiter, userServiceHandler);
app.use('/api/orders', authMiddleware, rateLimiter, orderServiceHandler);

// Global error handler
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  logger.info(`Gateway running on port ${PORT}`);
});