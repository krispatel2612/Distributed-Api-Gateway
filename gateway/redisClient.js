const { createClient } = require("redis");

const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379
    }
});

redisClient.on("error", (error) => {
    console.error("Redis Error:", error.message);
});

async function connectRedis() {

    if (!redisClient.isOpen) {

        console.log("Redis connecting...");

        await redisClient.connect();

        console.log("Redis connected and ready");
    }
}

module.exports = {
    redisClient,
    connectRedis
};