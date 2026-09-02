const http = require("http");

const servers = [
    {
        port: 3001,
        healthy: true
    },
    {
        port: 3011,
        healthy: true
    },
    {
        port: 3021,
        healthy: true
    }
];

let currentServer = 0;

// ==========================================
// Health Check
// ==========================================

function checkServerHealth(server) {
    const request = http.get(
        {
            hostname: "localhost",
            port: server.port,
            path: "/health",
            timeout: 2000
        },
        (response) => {
            if (response.statusCode === 200) {
                if (!server.healthy) {
                    console.log(
                        `Server recovered: ${server.port}`
                    );
                }

                server.healthy = true;
            } else {
                server.healthy = false;
            }

            response.resume();
        }
    );

    request.on("error", () => {
        if (server.healthy) {
            console.log(
                `Server DOWN: ${server.port}`
            );
        }

        server.healthy = false;
    });

    request.on("timeout", () => {
        request.destroy();
        server.healthy = false;
    });
}

// Check immediately
servers.forEach(checkServerHealth);

// Check every 5 seconds
setInterval(() => {
    servers.forEach(checkServerHealth);
}, 5000);

// ==========================================
// Select Healthy Server
// ==========================================

function getNextServer() {
    for (let i = 0; i < servers.length; i++) {
        const index =
            (currentServer + i) % servers.length;

        if (servers[index].healthy) {
            const server = servers[index];

            currentServer =
                (index + 1) % servers.length;

            return server;
        }
    }

    return null;
}

// ==========================================
// User Service Handler
// ==========================================

function handleUserRequest(req, res) {
    const server = getNextServer();

    if (!server) {
        return res.status(503).json({
            message:
                "No healthy User Service instances available"
        });
    }

    console.log(
        `Routing request to User Service :${server.port}`
    );

    // Express has already removed /api/users
    // from req.url because of app.use("/api/users", ...)
    let userPath = req.url;

    if (!userPath || userPath === "/") {
        userPath = "/";
    }

    const targetPath =
        "/users" +
        (userPath === "/" ? "/" : userPath);

    console.log(
        `Forwarding request to :${server.port}${targetPath}`
    );

    const options = {
        hostname: "localhost",
        port: server.port,
        path: targetPath,
        method: req.method,
        headers: {
            ...req.headers,
            host: `localhost:${server.port}`
        }
    };

    const proxyRequest = http.request(
        options,
        (proxyResponse) => {
            res.status(proxyResponse.statusCode);

            Object.keys(proxyResponse.headers).forEach(
                (header) => {
                    res.setHeader(
                        header,
                        proxyResponse.headers[header]
                    );
                }
            );

            proxyResponse.pipe(res);
        }
    );

    proxyRequest.on("error", (error) => {
        console.log(
            `Request failed on :${server.port}`
        );

        console.log(error.message);

        server.healthy = false;

        if (!res.headersSent) {
            res.status(502).json({
                message:
                    "User Service request failed",
                server: server.port
            });
        }
    });

    req.pipe(proxyRequest);
}

module.exports = {
    handleUserRequest
};