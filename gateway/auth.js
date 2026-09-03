const jwt = require("jsonwebtoken");

function login(req, res) {

    const { username, password } = req.body;

    // Demo credentials
    if (
        username !== "kris" ||
        password !== "12345"
    ) {
        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    const user = {
        id: 1,
        username: "kris",
        role: "user"
    };

    const token = jwt.sign(
        user,
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h"
        }
    );

    res.json({
        message: "Login successful",
        token: token
    });
}

module.exports = {
    login
};