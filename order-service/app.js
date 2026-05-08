require('dotenv').config();
const express = require('express');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'order-service',
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

app.use('/', orderRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => console.log(`Order service running on port ${PORT}`));