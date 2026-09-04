const http = require("http");


// ==========================================
// User Service Instances
// ==========================================

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


// ==========================================
// Configuration
// ==========================================

let currentServer = 0;

const MAX_RETRIES = 3;

const HEALTH_CHECK_INTERVAL = 5000;

const REQUEST_TIMEOUT = 2000;


// ==========================================
// Health Check
// ==========================================

function checkServerHealth(server) {

    const request = http.get(
        {
            hostname: "localhost",
            port: server.port,
            path: "/health",
            timeout: REQUEST_TIMEOUT
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

                if (server.healthy) {

                    console.log(
                        `Server unhealthy: ${server.port}`
                    );
                }

                server.healthy = false;
            }

            response.resume();
        }
    );


    // ======================================
    // Connection Error
    // ======================================

    request.on("error", () => {

        if (server.healthy) {

            console.log(
                `Server DOWN: ${server.port}`
            );
        }

        server.healthy = false;
    });


    // ======================================
    // Timeout
    // ======================================

    request.on("timeout", () => {

        request.destroy();

        if (server.healthy) {

            console.log(
                `Server DOWN: ${server.port}`
            );
        }

        server.healthy = false;
    });
}


// ==========================================
// Start Health Checks
// ==========================================

servers.forEach(checkServerHealth);

setInterval(() => {

    servers.forEach(checkServerHealth);

}, HEALTH_CHECK_INTERVAL);


// ==========================================
// Select Next Healthy Server
// ==========================================

function getNextServer(excludedPorts = []) {

    for (
        let i = 0;
        i < servers.length;
        i++
    ) {

        const index =
            (currentServer + i) %
            servers.length;

        const server = servers[index];


        if (
            server.healthy &&
            !excludedPorts.includes(server.port)
        ) {

            currentServer =
                (index + 1) %
                servers.length;

            return server;
        }
    }

    return null;
}


// ==========================================
// Build Target Path
// ==========================================

function getTargetPath(req) {

    // Express removes /api/users
    // because this handler is mounted on:
    //
    // app.use("/api/users", handleUserRequest)

    let userPath = req.url || "/";


    // Make sure path starts with /
    if (!userPath.startsWith("/")) {

        userPath = "/" + userPath;
    }


    return (
        "/users" +
        userPath
    );
}


// ==========================================
// Proxy Request
// ==========================================

function proxyToServer(
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

                host:
                    `localhost:${server.port}`
            }
        };


        console.log(
            `Forwarding to :${server.port}${targetPath}`
        );


        const proxy = http.request(
            options,
            (proxyResponse) => {

                // ==================================
                // Server responded
                // ==================================

                res.status(
                    proxyResponse.statusCode
                );


                // ==================================
                // Copy response headers
                // ==================================

                Object.keys(
                    proxyResponse.headers
                ).forEach((header) => {

                    // Do NOT overwrite
                    // Gateway cache header
                    if (
                        header.toLowerCase() ===
                        "x-cache"
                    ) {

                        return;
                    }


                    // Express will manage this
                    if (
                        header.toLowerCase() ===
                        "content-length"
                    ) {

                        return;
                    }


                    res.setHeader(
                        header,
                        proxyResponse.headers[header]
                    );
                });


                // ==================================
                // Forward response
                // ==================================

                proxyResponse.pipe(res);


                // ==================================
                // Request succeeded
                // ==================================

                resolve();
            }
        );


        // ======================================
        // Proxy Error
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
        // Proxy Timeout
        // ======================================

        proxy.setTimeout(
            REQUEST_TIMEOUT,
            () => {

                console.log(
                    `Request timeout on :${server.port}`
                );


                proxy.destroy();


                server.healthy = false;


                reject(
                    new Error(
                        "Request timeout"
                    )
                );
            }
        );


        // ======================================
        // Forward Client Request
        // ======================================

        req.pipe(proxy);
    });
}


// ==========================================
// Handle User Request
// ==========================================

async function handleUserRequest(req, res) {

    const attemptedServers = [];

    const targetPath =
        getTargetPath(req);


    // ==========================================
    // Retry / Failover
    // ==========================================

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        const server =
            getNextServer(
                attemptedServers
            );


        // ======================================
        // No Healthy Server
        // ======================================

        if (!server) {

            if (!res.headersSent) {

                return res.status(503).json({
                    message:
                        "No healthy User Service instances available"
                });
            }

            return;
        }


        attemptedServers.push(
            server.port
        );


        console.log(
            `Attempt ${attempt}: ` +
            `User Service :${server.port}`
        );


        try {

            await proxyToServer(
                req,
                res,
                server,
                targetPath
            );


            // ==================================
            // SUCCESS
            // ==================================

            return;

        } catch (error) {

            console.log(
                `Failover triggered from :${server.port}`
            );


            // If response has already started,
            // don't try another server.
            if (res.headersSent) {

                return;
            }


            // Continue to next healthy server
        }
    }


    // ==========================================
    // All Attempts Failed
    // ==========================================

    if (!res.headersSent) {

        return res.status(503).json({

            message:
                "User Service unavailable after retries",

            attempts:
                attemptedServers
        });
    }
}


// ==========================================
// Export
// ==========================================

module.exports = {
    handleUserRequest
};