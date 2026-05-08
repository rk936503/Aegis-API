const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

//Create a new order
router.post('/', async(req, res) => {
    try {
        const username = req.headers['x-user'];
        const { items } = req.body;
        
        if(!username){
            return res.status(401).json({ error: "Unauthorized" });
        }
        
        if(!items || !Array.isArray(items) || items.length === 0){
            return res.status(400).json({ error: "Order must contain items" });
        }

        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const order = await prisma.order.create({
            data: {
                username,
                totalAmount,
                items: {
                    create: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
            include: {
                items: true //Return the items in the respose
            }
        });

        res.status(201).json(order);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get all orders for the current user
router.get('/', async(req, res) => {
    try {
        const username = req.headers['x-user'];

        if(!username){
            return res.status(401).json({ error: "Unauthorized" });
        }

        const orders = await prisma.order.findMany({
            where: { username },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get a specific order by ID
router.get('/:id', async(req, res) => {
    try {
        const username = req.headers['x-user'];
        const orderId = parseInt(req.params.id);

        if(!username){
            return res.status(401).json({ error: "Unauthorized" });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if(!order){
            return res.status(404).json({ error: "Order not found" });
        }

        // Ensure users can only view their own orders!
        if(order.username !== username){
            return res.status(403).json({ error: "Forbidden: You cannot access this order" });
        }

        res.json(orders);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;