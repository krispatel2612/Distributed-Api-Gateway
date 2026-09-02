const { createProxyMiddleware } = require("http-proxy-middleware");

const servers = [
    "http://localhost:3001",
    "http://localhost:3011",
    "http://localhost:3021"
];

let currentServer = 0;

function getNextServer() {
    const server = servers[currentServer];

    currentServer = (currentServer + 1) % servers.length;

    return server;
}

function userServiceLoadBalancer() {
    return createProxyMiddleware({
        target: servers[0],
        changeOrigin: true,

        router: () => {
            const server = getNextServer();

            console.log(`Routing request to: ${server}`);

            return server;
        },

        pathRewrite: (path) => {
            return "/users" + path;
        }
    });
}

module.exports = {
    userServiceLoadBalancer
};