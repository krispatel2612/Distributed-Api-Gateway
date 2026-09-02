const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const PORT = 3000;

// API Gateway information
app.get("/", (req, res) => {
    res.json({
        service: "API Gateway",
        status: "running",
        port: PORT
    });
});

// User Service
app.use(
    "/api/users",
    createProxyMiddleware({
        target: "http://localhost:3001",
        changeOrigin: true,
        pathRewrite: {
            "^/": "/users/"
        }
    })
);

// Gateway health check
app.get("/health", (req, res) => {
    res.json({
        service: "api-gateway",
        status: "UP"
    });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});