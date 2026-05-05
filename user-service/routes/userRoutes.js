const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

//Get current user's profile
router.get('/profile', async (req, res) => {
    try {
        const username = req.headers['x-user'];

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        let profile = await prisma.userProfile.findUnique({
            where: { username },
        });

        // Auto-create profile if it doesn't exist (first time after registration)
        if (!profile) {
            profile = await prisma.userProfile.create({
                data: { username },
            });
        }

        res.json(profile);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Update current user's profile
router.put('/profile', async (req, res) => {
    try {
        const username = req.headers['x-user'];

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { email, bio, avatar } = req.body;

        // Input validation
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (bio && bio.length > 500) {
            return res.status(400).json({ error: "Bio must be under 500 characters" });
        }

        //Create if not exists, update if exists
        const profile = await prisma.userProfile.upsert({
            where: { username },
            update: { email, bio, avatar },
            create: { username, email, bio, avatar },
        });

        res.json(profile);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//List all users
router.get('/all', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [profiles, total] = await Promise.all([
            prisma.userProfile.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    bio: true,
                    createdAt: true,
                },
            }),
            prisma.userProfile.count(),
        ]);

        res.json({
            data: profiles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Get any user's public profile
router.get('/:username', async (req, res) => {
    try {
        const profile = await prisma.userProfile.findUnique({
            where: { username: req.params.username },
            select: {
                id: true,
                username: true,
                email: true,
                bio: true,
                createdAt: true,
            },
        });

        if (!profile) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(profile);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Delete own account
router.delete('/profile', async (req, res) => {
    try {
        const username = req.headers['x-user'];

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await prisma.userProfile.delete({
            where: { username },
        });

        res.json({ message: "Profile deleted successfully" });

    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: "Profile not found" });
        }
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
