const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

// ==========================================
// Home
// ==========================================

app.get("/", (req, res) => {
    res.json({
        service: "User Service",
        status: "running",
        port: PORT
    });
});

// ==========================================
// Get All Users
// ==========================================

app.get("/users", (req, res) => {

    res.json({
        instance: process.env.INSTANCE_NAME || PORT,

        users: [
            {
                id: 1,
                name: "Kris",
                email: "kris@example.com"
            },
            {
                id: 2,
                name: "Rahul",
                email: "rahul@example.com"
            }
        ]
    });
});

// ==========================================
// Get User By ID
// ==========================================

app.get("/users/:id", (req, res) => {

    const id = req.params.id;

    res.json({
        instance: process.env.INSTANCE_NAME || PORT,
        id: id,
        name: "Kris",
        email: "kris@example.com"
    });
});

// ==========================================
// Health Check
// ==========================================

app.get("/health", (req, res) => {

    res.status(200).json({
        service: "user-service",
        status: "UP",
        instance: process.env.INSTANCE_NAME || PORT,
        port: PORT
    });
});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `User Service ${process.env.INSTANCE_NAME || ""} running on port ${PORT}`
    );

});