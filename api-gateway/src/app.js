require('dotenv').config();
const express = require('express');

const loggerMiddleware = require('./middleware/logger')
const logger = require('./utils/logger');

const { userServiceProxy, orderServiceProxy } = require('./routes/proxyRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT;


app.use(loggerMiddleware);

app.use(rateLimiter);

app.use('/auth', authRoutes); //proxy to auth service

app.use('/api/users', authMiddleware, userServiceProxy);
app.use('/api/orders', authMiddleware, orderServiceProxy);

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