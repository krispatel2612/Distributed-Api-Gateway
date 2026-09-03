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

const MAX_RETRIES = 3;


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


// ==========================================
// Run Health Checks
// ==========================================

servers.forEach(checkServerHealth);

setInterval(() => {

    servers.forEach(checkServerHealth);

}, 5000);


// ==========================================
// Select Healthy Server
// ==========================================

function getNextServer(excludedPorts = []) {

    for (let i = 0; i < servers.length; i++) {

        const index =
            (currentServer + i) % servers.length;

        const server = servers[index];

        if (
            server.healthy &&
            !excludedPorts.includes(server.port)
        ) {

            currentServer =
                (index + 1) % servers.length;

            return server;
        }
    }

    return null;
}


// ==========================================
// Proxy One Request
// ==========================================

function proxyRequest(
    req,
    res,
    server,
    targetPath
) {

    return new Promise((resolve, reject) => {

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


        const proxy = http.request(
            options,
            (proxyResponse) => {

                // Successful response
                res.status(proxyResponse.statusCode);

                Object.keys(
                    proxyResponse.headers
                ).forEach((header) => {

                    res.setHeader(
                        header,
                        proxyResponse.headers[header]
                    );

                });

                proxyResponse.pipe(res);

                resolve();
            }
        );


        // ======================================
        // Request Error
        // ======================================

        proxy.on("error", (error) => {

            console.log(
                `Request failed on :${server.port}`
            );

            console.log(
                error.message
            );

            server.healthy = false;

            reject(error);
        });


        // ======================================
        // Request Timeout
        // ======================================

        proxy.setTimeout(2000, () => {

            console.log(
                `Request timeout on :${server.port}`
            );

            proxy.destroy();

            server.healthy = false;

            reject(
                new Error("Request timeout")
            );
        });


        // ======================================
        // Send Client Request
        // ======================================

        req.pipe(proxy);
    });
}


// ==========================================
// Handle User Request
// ==========================================

async function handleUserRequest(req, res) {

    const attemptedServers = [];

    // Express removes /api/users
    // from req.url.

    let userPath = req.url;

    if (!userPath || userPath === "/") {
        userPath = "/";
    }

    const targetPath =
        "/users" +
        (userPath === "/"
            ? "/"
            : userPath);


    // ======================================
    // Retry Loop
    // ======================================

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        const server =
            getNextServer(
                attemptedServers
            );


        // ==================================
        // No Server Available
        // ==================================

        if (!server) {

            return res.status(503).json({
                message:
                    "No healthy User Service instances available"
            });
        }


        attemptedServers.push(
            server.port
        );


        console.log(
            `Attempt ${attempt}: ` +
            `User Service :${server.port}`
        );

        console.log(
            `Forwarding to :${server.port}${targetPath}`
        );


        try {

            await proxyRequest(
                req,
                res,
                server,
                targetPath
            );

            // Request succeeded
            return;

        } catch (error) {

            console.log(
                `Failover triggered from :${server.port}`
            );

            // Continue loop
        }
    }


    // ======================================
    // All Retries Failed
    // ======================================

    if (!res.headersSent) {

        return res.status(503).json({
            message:
                "User Service unavailable after retries"
        });
    }
}


module.exports = {
    handleUserRequest
};