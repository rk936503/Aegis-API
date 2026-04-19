const express = require('express');
const app = express();

app.get('/users', (req, res) => {
    res.json({ message: "User Service Running" });
});

app.listen(5001, () => console.log('User service on 5001'));