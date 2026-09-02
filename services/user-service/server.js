const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Home route
app.get("/", (req, res) => {
    res.json({
        service: "User Service",
        status: "running",
        port: PORT
    });
});

// Get users
app.get("/users", (req, res) => {
    res.json({
        instance: PORT,
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

// Get user by ID
app.get("/users/:id", (req, res) => {
    const id = req.params.id;

    res.json({
        id: id,
        name: "Kris",
        email: "kris@example.com"
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        service: "user-service",
        status: "UP"
    });
});

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});