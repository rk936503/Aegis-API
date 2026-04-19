require('dotenv').config();
const express = require('express');
const { userServiceProxy, orderServiceProxy } = require('./routes/proxyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

const logger = require('./middleware/logger');
app.use(logger);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});


app.use('/api/users', userServiceProxy);
app.use('/api/orders', orderServiceProxy);


app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});