const express = require("express");
const {
    createProxyMiddleware
} = require("http-proxy-middleware");

const {
    handleUserRequest
} = require("./loadBalancer");

const app = express();

const PORT = 3000;

// ==========================================
// Gateway Information
// ==========================================

app.get("/", (req, res) => {
    res.json({
        service: "API Gateway",
        status: "running",
        port: PORT
    });
});

// ==========================================
// User Service
// ==========================================

app.use(
    "/api/users",
    handleUserRequest
);

// ==========================================
// Product Service
// ==========================================

app.use(
    "/api/products",
    createProxyMiddleware({
        target: "http://localhost:3002",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/products/"
        }
    })
);

// ==========================================
// Order Service
// ==========================================

app.use(
    "/api/orders",
    createProxyMiddleware({
        target: "http://localhost:3003",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/orders/"
        }
    })
);

// ==========================================
// Gateway Health
// ==========================================

app.get("/health", (req, res) => {
    res.json({
        service: "api-gateway",
        status: "UP"
    });
});

// ==========================================
// Start Gateway
// ==========================================

app.listen(PORT, () => {
    console.log(
        `API Gateway running on port ${PORT}`
    );
});