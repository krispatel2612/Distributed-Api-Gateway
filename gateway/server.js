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

const {
    connectRedis
} = require("./redisClient");

const {
    rateLimiter
} = require("./middleware/rateLimiter");

const {
    cacheResponse
} = require("./middleware/cache");


const app = express();

const PORT = 3000;


// ==========================================
// Global Middleware
// ==========================================

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

// Login does NOT require JWT
// because this endpoint creates the token.

app.post(
    "/auth/login",
    login
);


// ==========================================
// User Service
//
// Rate Limiting
//      ↓
// JWT Authentication
//      ↓
// Redis Cache
//      ↓
// Load Balancer
//      ↓
// User Service Instances
// ==========================================

app.use(
    "/api/users",

    rateLimiter,

    authenticateToken,

    cacheResponse,

    handleUserRequest
);


// ==========================================
// Product Service
//
// Rate Limiting
//      ↓
// JWT Authentication
//      ↓
// Reverse Proxy
//      ↓
// Product Service
// ==========================================

app.use(
    "/api/products",

    rateLimiter,

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
//
// Rate Limiting
//      ↓
// JWT Authentication
//      ↓
// Reverse Proxy
//      ↓
// Order Service
// ==========================================

app.use(
    "/api/orders",

    rateLimiter,

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
// Gateway Health Check
// ==========================================

app.get("/health", (req, res) => {

    res.status(200).json({

        service: "api-gateway",

        status: "UP",

        port: PORT

    });

});


// ==========================================
// 404 Handler
// ==========================================

app.use((req, res) => {

    res.status(404).json({

        message: "Route not found",

        path: req.originalUrl

    });

});


// ==========================================
// Global Error Handler
// ==========================================

app.use((err, req, res, next) => {

    console.error(
        "Gateway Error:",
        err
    );

    if (res.headersSent) {

        return next(err);

    }

    res.status(500).json({

        message: "Internal Gateway Error"

    });

});


// ==========================================
// Start Gateway
// ==========================================

async function startServer() {

    try {

        console.log("Connecting to Redis...");

        await connectRedis();

        console.log("Redis connected and ready");


        app.listen(PORT, () => {

            console.log(
                `API Gateway running on port ${PORT}`
            );

            console.log(
                `Gateway URL: http://localhost:${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "Failed to connect to Redis:"
        );

        console.error(error);

        process.exit(1);

    }

}


startServer();