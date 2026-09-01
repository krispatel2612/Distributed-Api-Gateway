const express = require("express");

const app = express();

app.use(express.json());

const PORT = 3003;

// Temporary order data
const orders = [
    {
        id: 1,
        userId: 1,
        productId: 101,
        quantity: 1,
        totalPrice: 55000,
        status: "confirmed"
    },
    {
        id: 2,
        userId: 2,
        productId: 102,
        quantity: 2,
        totalPrice: 5000,
        status: "pending"
    }
];

// Home route
app.get("/", (req, res) => {
    res.json({
        service: "Order Service",
        status: "running"
    });
});

// Get all orders
app.get("/orders", (req, res) => {
    res.json(orders);
});

// Get order by ID
app.get("/orders/:id", (req, res) => {
    const id = Number(req.params.id);

    const order = orders.find(order => order.id === id);

    if (!order) {
        return res.status(404).json({
            message: "Order not found"
        });
    }

    res.json(order);
});

// Create a new order
app.post("/orders", (req, res) => {
    const { userId, productId, quantity, totalPrice } = req.body;

    if (!userId || !productId || !quantity || !totalPrice) {
        return res.status(400).json({
            message: "userId, productId, quantity and totalPrice are required"
        });
    }

    const newOrder = {
        id: orders.length + 1,
        userId,
        productId,
        quantity,
        totalPrice,
        status: "pending"
    };

    orders.push(newOrder);

    res.status(201).json({
        message: "Order created successfully",
        order: newOrder
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        service: "order-service",
        status: "UP"
    });
});

app.listen(PORT, () => {
    console.log(`Order Service running on port ${PORT}`);
});