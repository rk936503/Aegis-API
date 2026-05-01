require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('./db/prisma')

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
            { username },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } 
        );

        const refreshToken = jwt.sign(
            { username },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d'}
        );

        res.json({ message: 'Login Successfull', accessToken, refreshToken });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error"});
    }
})

app.listen(5003, () => console.log('Auth service running on 5003'));