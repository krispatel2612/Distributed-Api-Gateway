const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3002;

// Home route
app.get("/", (req, res) => {
    res.json({
        service: "Product Service",
        status: "running"
    });
});

// Get all products
app.get("/products", (req, res) => {
    res.json([
        {
            id: 101,
            name: "Laptop",
            price: 55000,
            category: "Electronics"
        },
        {
            id: 102,
            name: "Keyboard",
            price: 2500,
            category: "Accessories"
        },
        {
            id: 103,
            name: "Mouse",
            price: 1200,
            category: "Accessories"
        }
    ]);
});

// Get product by ID
app.get("/products/:id", (req, res) => {
    const id = req.params.id;

    res.json({
        id: id,
        name: "Laptop",
        price: 55000,
        category: "Electronics"
    });
});

// Create a product
app.post("/products", (req, res) => {
    const product = req.body;

    res.status(201).json({
        message: "Product created successfully",
        product: product
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        service: "product-service",
        status: "UP"
    });
});

app.listen(PORT, () => {
    console.log(`Product Service running on port ${PORT}`);
});