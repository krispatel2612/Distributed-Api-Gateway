const {
    redisClient
} = require("../redisClient");

const CACHE_TTL = 60;


// ==========================================
// Redis Cache Middleware
// ==========================================

async function cacheResponse(req, res, next) {

    // ======================================
    // Only cache GET requests
    // ======================================

    if (req.method !== "GET") {
        return next();
    }


    // ======================================
    // Create Cache Key
    // ======================================

    const cacheKey =
        `cache:${req.originalUrl}`;


    try {

        // ======================================
        // Check Redis
        // ======================================

        const cachedData =
            await redisClient.get(cacheKey);


        // ======================================
        // CACHE HIT
        // ======================================

        if (cachedData) {

            console.log(
                `CACHE HIT: ${cacheKey}`
            );


            const cachedResponse =
                JSON.parse(cachedData);


            // ==================================
            // Set cached status
            // ==================================

            res.status(
                cachedResponse.statusCode || 200
            );


            // ==================================
            // Restore cached headers
            // ==================================

            if (cachedResponse.headers) {

                Object.entries(
                    cachedResponse.headers
                ).forEach(([key, value]) => {

                    // Never restore these headers
                    if (
                        key.toLowerCase() ===
                        "content-length"
                    ) {
                        return;
                    }


                    // IMPORTANT:
                    // Never restore X-Cache from Redis.
                    if (
                        key.toLowerCase() ===
                        "x-cache"
                    ) {
                        return;
                    }


                    res.setHeader(
                        key,
                        value
                    );

                });

            }


            // ==================================
            // Tell client this was a HIT
            // ==================================

            res.setHeader(
                "X-Cache",
                "HIT"
            );


            // ==================================
            // Return cached response
            // ==================================

            return res.send(
                cachedResponse.body
            );
        }


        // ======================================
        // CACHE MISS
        // ======================================

        console.log(
            `CACHE MISS: ${cacheKey}`
        );


        res.setHeader(
            "X-Cache",
            "MISS"
        );


        // ======================================
        // Save Original Response Methods
        // ======================================

        const originalWrite =
            res.write.bind(res);

        const originalEnd =
            res.end.bind(res);


        // ======================================
        // Store Response Body
        // ======================================

        let responseBody =
            Buffer.alloc(0);


        // ======================================
        // Capture res.write()
        // ======================================

        res.write = function (
            chunk,
            encoding
        ) {

            if (chunk) {

                responseBody =
                    Buffer.concat([

                        responseBody,

                        Buffer.isBuffer(chunk)
                            ? chunk
                            : Buffer.from(
                                chunk,
                                encoding
                            )

                    ]);
            }


            return originalWrite(
                chunk,
                encoding
            );
        };


        // ======================================
        // Capture res.end()
        // ======================================

        res.end = async function (
            chunk,
            encoding
        ) {

            if (chunk) {

                responseBody =
                    Buffer.concat([

                        responseBody,

                        Buffer.isBuffer(chunk)
                            ? chunk
                            : Buffer.from(
                                chunk,
                                encoding
                            )

                    ]);
            }


            // ==================================
            // Cache only successful responses
            // ==================================

            if (
                res.statusCode >= 200 &&
                res.statusCode < 300 &&
                responseBody.length > 0
            ) {

                try {

                    // ==================================
                    // Get response headers
                    // ==================================

                    const headers = {
                        ...res.getHeaders()
                    };


                    // ==================================
                    // IMPORTANT
                    // Don't store X-Cache
                    // ==================================

                    delete headers["x-cache"];


                    // ==================================
                    // Don't store Content-Length
                    // ==================================

                    delete headers["content-length"];


                    // ==================================
                    // Build cache object
                    // ==================================

                    const cacheData = {

                        statusCode:
                            res.statusCode,

                        headers:
                            headers,

                        body:
                            responseBody.toString()

                    };


                    // ==================================
                    // Save to Redis
                    // ==================================

                    await redisClient.setEx(

                        cacheKey,

                        CACHE_TTL,

                        JSON.stringify(
                            cacheData
                        )

                    );


                    console.log(
                        `CACHE SET: ${cacheKey}`
                    );


                } catch (error) {

                    console.error(
                        "CACHE SET error:",
                        error.message
                    );

                }

            }


            // ==================================
            // Send Original Response
            // ==================================

            return originalEnd(
                chunk,
                encoding
            );
        };


        // ======================================
        // Continue Request
        // ======================================

        next();


    } catch (error) {

        console.error(
            "CACHE GET error:",
            error.message
        );


        // ======================================
        // Redis failure should NOT
        // break the Gateway.
        // ======================================

        next();
    }
}


// ==========================================
// Export
// ==========================================

module.exports = {
    cacheResponse
};