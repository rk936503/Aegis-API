const express = require('express');
const app = express();

app.get('/orders', (req, res) => {
    res.json({ message: "Order Service Working" });
});

app.listen(5002, () => console.log('Order service on 5002'));