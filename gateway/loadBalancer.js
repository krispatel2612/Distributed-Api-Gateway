
const http = require("http");

// ==========================================
// User Service Instances
// ==========================================

const servers = [
    {
        name: "user-service-1",
        host: process.env.USER_SERVICE_1_HOST || "user-service-1",
        port: Number(process.env.USER_SERVICE_1_PORT) || 3001,
        healthy: false
    },
    {
        name: "user-service-2",
        host: process.env.USER_SERVICE_2_HOST || "user-service-2",
        port: Number(process.env.USER_SERVICE_2_PORT) || 3001,
        healthy: false
    },
    {
        name: "user-service-3",
        host: process.env.USER_SERVICE_3_HOST || "user-service-3",
        port: Number(process.env.USER_SERVICE_3_PORT) || 3001,
        healthy: false
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
            hostname: server.host,
            port: server.port,
            path: "/health",
            timeout: REQUEST_TIMEOUT
        },
        (response) => {

            if (response.statusCode === 200) {

                if (!server.healthy) {
                    console.log(
                        `Server recovered: ${server.name} (${server.host}:${server.port})`
                    );
                }

                server.healthy = true;

            } else {

                if (server.healthy) {
                    console.log(
                        `Server unhealthy: ${server.name}`
                    );
                }

                server.healthy = false;
            }

            response.resume();
        }
    );

    request.on("error", (error) => {

        if (server.healthy) {
            console.log(
                `Server DOWN: ${server.name} (${server.host}:${server.port})`
            );
        }

        server.healthy = false;
    });

    request.on("timeout", () => {

        request.destroy();

        if (server.healthy) {
            console.log(
                `Server TIMEOUT: ${server.name}`
            );
        }

        server.healthy = false;
    });
}

// ==========================================
// Start Health Checks
// ==========================================

console.log("Starting User Service health checks...");

servers.forEach(checkServerHealth);

setInterval(() => {

    servers.forEach(checkServerHealth);

}, HEALTH_CHECK_INTERVAL);

// ==========================================
// Select Next Healthy Server
// ==========================================

function getNextServer(excludedServers = []) {

    for (let i = 0; i < servers.length; i++) {

        const index =
            (currentServer + i) % servers.length;

        const server = servers[index];

        if (
            server.healthy &&
            !excludedServers.includes(server.name)
        ) {

            currentServer =
                (index + 1) % servers.length;

            return server;
        }
    }

    return null;
}

// ==========================================
// Build Target Path
// ==========================================

function getTargetPath(req) {

    let userPath = req.url || "/";

    if (!userPath.startsWith("/")) {
        userPath = "/" + userPath;
    }

    return "/users" + userPath;
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

            hostname: server.host,

            port: server.port,

            path: targetPath,

            method: req.method,

            headers: {
                ...req.headers,

                host:
                    `${server.host}:${server.port}`
            }
        };

        console.log(
            `Forwarding to ${server.name} ` +
            `(${server.host}:${server.port})${targetPath}`
        );

        const proxy = http.request(
            options,
            (proxyResponse) => {

                // ==================================
                // Response Status
                // ==================================

                res.status(
                    proxyResponse.statusCode
                );

                // ==================================
                // Copy Headers
                // ==================================

                Object.keys(
                    proxyResponse.headers
                ).forEach((header) => {

                    const lowerHeader =
                        header.toLowerCase();

                    // Gateway controls cache header
                    if (
                        lowerHeader === "x-cache"
                    ) {
                        return;
                    }

                    // Express manages content length
                    if (
                        lowerHeader === "content-length"
                    ) {
                        return;
                    }

                    res.setHeader(
                        header,
                        proxyResponse.headers[header]
                    );
                });

                // ==================================
                // Forward Response
                // ==================================

                proxyResponse.pipe(res);

                resolve();
            }
        );

        // ==========================================
        // Proxy Error
        // ==========================================

        proxy.on("error", (error) => {

            console.log(
                `Request failed on ${server.name}`
            );

            console.log(
                error.message
            );

            server.healthy = false;

            reject(error);
        });

        // ==========================================
        // Proxy Timeout
        // ==========================================

        proxy.setTimeout(
            REQUEST_TIMEOUT,
            () => {

                console.log(
                    `Request timeout on ${server.name}`
                );

                proxy.destroy();

                server.healthy = false;

                reject(
                    new Error("Request timeout")
                );
            }
        );

        // ==========================================
        // Forward Request
        // ==========================================

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
            server.name
        );

        console.log(
            `Attempt ${attempt}: ` +
            `${server.name}`
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
                `Failover triggered from ${server.name}`
            );

            if (res.headersSent) {
                return;
            }

            // Continue to next server
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

