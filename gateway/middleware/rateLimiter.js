const {
    redisClient
} = require("../redisClient");

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

async function rateLimiter(req, res, next) {

    try {

        const clientIp =
            req.ip ||
            req.socket.remoteAddress ||
            "unknown";

        const key =
            `rate-limit:${clientIp}`;

        const currentCount =
            await redisClient.incr(key);

        // First request
        if (currentCount === 1) {

            await redisClient.expire(
                key,
                WINDOW_SECONDS
            );
        }

        res.setHeader(
            "X-RateLimit-Limit",
            MAX_REQUESTS
        );

        res.setHeader(
            "X-RateLimit-Remaining",
            Math.max(
                0,
                MAX_REQUESTS - currentCount
            )
        );

        if (currentCount > MAX_REQUESTS) {

            return res.status(429).json({
                message:
                    "Too many requests. Please try again later.",
                retryAfter:
                    WINDOW_SECONDS
            });
        }

        next();

    } catch (error) {

        console.error(
            "Rate limiter error:",
            error
        );

        // If Redis fails, allow the request.
        next();
    }
}

module.exports = {
    rateLimiter
};