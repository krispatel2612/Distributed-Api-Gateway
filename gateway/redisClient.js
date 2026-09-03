const { createClient } = require("redis");

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (error) => {
    console.error("Redis Error:", error);
});

redisClient.on("connect", () => {
    console.log("Redis connecting...");
});

redisClient.on("ready", () => {
    console.log("Redis connected and ready");
});

async function connectRedis() {

    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

}

module.exports = {
    redisClient,
    connectRedis
};