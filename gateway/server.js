require("dotenv").config();

const express = require("express");

const {
    createProxyMiddleware
} = require("http-proxy-middleware");

const {
    handleUserRequest
} = require("./loadBalancer");

const {
    authenticateToken
} = require("./middleware/auth");

const {
    login
} = require("./auth");

const app = express();

const PORT = 3000;

app.use(express.json());


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
// Authentication
// ==========================================

app.post(
    "/auth/login",
    login
);


// ==========================================
// User Service
// Protected + Load Balanced
// ==========================================

app.use(
    "/api/users",
    authenticateToken,
    handleUserRequest
);


// ==========================================
// Product Service
// Protected
// ==========================================

app.use(
    "/api/products",
    authenticateToken,
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
// Protected
// ==========================================

app.use(
    "/api/orders",
    authenticateToken,
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