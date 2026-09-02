const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const PORT = 3000;

// ===============================
// API Gateway Information
// ===============================

app.get("/", (req, res) => {
    res.json({
        service: "API Gateway",
        status: "running",
        port: PORT
    });
});

// ===============================
// User Service
// /api/users → /users
// /api/users/1 → /users/1
// ===============================

app.use(
    "/api/users",
    createProxyMiddleware({
        target: "http://localhost:3001",
        changeOrigin: true,
        pathRewrite: (path) => {
            return "/users" + path;
        }
    })
);

// ===============================
// Product Service
// /api/products → /products
// /api/products/101 → /products/101
// ===============================

app.use(
    "/api/products",
    createProxyMiddleware({
        target: "http://localhost:3002",
        changeOrigin: true,
        pathRewrite: (path) => {
            return "/products" + path;
        }
    })
);

// ===============================
// Order Service
// /api/orders → /orders
// /api/orders/1 → /orders/1
// ===============================

app.use(
    "/api/orders",
    createProxyMiddleware({
        target: "http://localhost:3003",
        changeOrigin: true,
        pathRewrite: (path) => {
            return "/orders" + path;
        }
    })
);

// ===============================
// Gateway Health Check
// ===============================

app.get("/health", (req, res) => {
    res.json({
        service: "api-gateway",
        status: "UP"
    });
});

// ===============================
// Start Gateway
// ===============================

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});