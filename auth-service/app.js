require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('./db/prisma');
const redis = require('./config/redis');

const app = express();
app.use(express.json());


//signup
app.post('/register', async(req, res) => {
    try {
        const {username, password} = req.body;

    if(!username || !password){
        return res.status(400).json({ error: "Username and Password required" });
    }
    if(password.length < 6){ 
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    //Validation
    const existingUser = await prisma.user.findUnique({
        where: { username },
    })
    if(existingUser){
        return res.status(400).json({ error: "User Already Exists" });
    }
    
    //hashing password
    const hashed = await bcrypt.hash(password, 10);

    //storing user
    await prisma.user.create({
        data: {
            username,
            password: hashed,
        },
    })

    res.status(201).json({ message: "User registered" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/login', async(req, res) => {
    try {
        const { username, password } = req.body;
    
        if(!username || !password){
            return res.status(400).json({ error: "Username and Password required" });
        }
        
        const user = await prisma.user.findUnique({
            where: { username },
        });
        if(!user) return res.status(401).json({ error: "Invalid Credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if(!valid) return res.status(401).json({ error: "Invalid Credentials" });

        const accessToken = jwt.sign(
            { username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } 
        );

        const refreshToken = jwt.sign(
            { username, role: user.role },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d'}
        );

        res.json({ message: 'Login Successfull', accessToken, refreshToken });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error"});
    }
});

//Refresh token endpoint
app.post('/refresh', async(req, res) => {
    try {
        const { refreshToken } = req.body;

        if(!refreshToken){
            return res.status(400).json({ error: "Refresh token required" });
        }

        // Check if token is blacklisted (user logged out)
        const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
        if (isBlacklisted) {
            return res.status(401).json({ error: "Token has been revoked" });
        }

        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Check if user still exists in DB (they might have been deleted)
        const user = await prisma.user.findUnique({
            where: { username: decoded.username },
        });

        if(!user){
            return res.status(401).json({ errror: "User no longer exists" });
        }

        //Issue a new access token
        const newAccessToken = jwt.sign(
            { username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });

    } catch (err) {
        if(err.name === 'TokenExpiredError'){
            return res.status(401).json({ error: "Refresh token expired, please login again" });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid refresh token" });
        }
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/logout', async(req, res) => {
    try {
        const { refreshToken } = req.body;

        if(!refreshToken){
            return res.status(400).json({ error: "Refresh token required" });
        }

        const decoded = jwt.decode(refreshToken);

        if(!decoded || !decoded.exp){
            return res.status(400).json({ error: "Invalid token" });
        }

        // Calculate remaining TTL(time to live)
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;

        if (ttl > 0) {
            // Blacklist the token in Redis
            await redis.set(`blacklist:${refreshToken}`, 'true', 'EX', ttl);
        }
        res.json({ message: "Logged out successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
})

app.listen(5003, () => console.log('Auth service running on 5003'));