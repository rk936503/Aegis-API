require('dotenv').config();
const express = require('express');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'user-service',
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

app.use('/', userRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => console.log(`User service running on port ${PORT}`));