const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

// Valid status transitions: a status can only move forward, never backward
const VALID_TRANSITIONS = {
    PENDING:   ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['SHIPPED'],
    SHIPPED:   ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};

// POST / — Create a new order
router.post('/', async (req, res) => {
    try {
        const username = req.headers['x-user'];
        const { items } = req.body;

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Order must contain at least one item" });
        }

        // Validate each item has required fields
        for (const item of items) {
            if (!item.productId || !item.quantity || !item.price) {
                return res.status(400).json({ error: "Each item must have productId, quantity, and price" });
            }
            if (item.quantity < 1) {
                return res.status(400).json({ error: "Item quantity must be at least 1" });
            }
            if (item.price < 0) {
                return res.status(400).json({ error: "Item price cannot be negative" });
            }
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
                        price: item.price,
                    })),
                },
            },
            include: { items: true },
        });

        res.status(201).json(order);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET / — List all orders for the current user (paginated)
router.get('/', async (req, res) => {
    try {
        const username = req.headers['x-user'];

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip  = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { username },
                include: { items: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.order.count({ where: { username } }),
        ]);

        res.json({
            data: orders,
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

// GET /:id — Get a specific order by ID (owner only)
router.get('/:id', async (req, res) => {
    try {
        const username = req.headers['x-user'];
        const orderId  = parseInt(req.params.id);

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (isNaN(orderId)) {
            return res.status(400).json({ error: "Invalid order ID" });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Resource-level authorization — users can only view their own orders
        if (order.username !== username) {
            return res.status(403).json({ error: "Forbidden: You cannot access this order" });
        }

        res.json(order); // ← was: res.json(orders) — BUG FIXED

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PATCH /:id/status — Update order status (owner only, validated transitions)
router.patch('/:id/status', async (req, res) => {
    try {
        const username  = req.headers['x-user'];
        const orderId   = parseInt(req.params.id);
        const { status } = req.body;

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (isNaN(orderId)) {
            return res.status(400).json({ error: "Invalid order ID" });
        }

        const newStatus = status?.toUpperCase();
        const allStatuses = Object.keys(VALID_TRANSITIONS);

        if (!newStatus || !allStatuses.includes(newStatus)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${allStatuses.join(', ')}`,
            });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.username !== username) {
            return res.status(403).json({ error: "Forbidden: You cannot modify this order" });
        }

        // Enforce transition rules — no skipping, no going back
        const allowed = VALID_TRANSITIONS[order.status];
        if (!allowed.includes(newStatus)) {
            return res.status(400).json({
                error: `Cannot transition from '${order.status}' to '${newStatus}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`,
            });
        }

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status: newStatus },
            include: { items: true },
        });

        res.json(updated);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE /:id — Soft-cancel an order (only if status is PENDING, owner only)
router.delete('/:id', async (req, res) => {
    try {
        const username = req.headers['x-user'];
        const orderId  = parseInt(req.params.id);

        if (!username) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (isNaN(orderId)) {
            return res.status(400).json({ error: "Invalid order ID" });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.username !== username) {
            return res.status(403).json({ error: "Forbidden: You cannot cancel this order" });
        }

        // Only PENDING orders can be cancelled by the user
        if (order.status !== 'PENDING') {
            return res.status(400).json({
                error: `Cannot cancel an order with status '${order.status}'. Only PENDING orders can be cancelled.`,
            });
        }

        // Soft cancel — update status instead of deleting the row
        const cancelled = await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
            include: { items: true },
        });

        res.json({ message: "Order cancelled successfully", order: cancelled });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;