require('dotenv').config();
const express = require('express');
const { userServiceProxy, orderServiceProxy } = require('./routes/proxyRoutes');
const logger = require('./middleware/logger');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.use(logger);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.use('/auth', require('./routes/authRoutes')); //proxy to auth service

app.use('/api/users', authMiddleware, userServiceProxy);
app.use('/api/orders', authMiddleware, orderServiceProxy);


app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});