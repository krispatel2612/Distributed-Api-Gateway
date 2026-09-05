const crypto = require("crypto");


// ==========================================
// Request Logger Middleware
// ==========================================

function requestLogger(req, res, next) {

    // ======================================
    // Generate Request ID
    // ======================================

    const requestId =
        crypto.randomUUID();


    // ======================================
    // Attach Request ID to request
    // ======================================

    req.requestId =
        requestId;


    // ======================================
    // Send Request ID to Client
    // ======================================

    res.setHeader(
        "X-Request-ID",
        requestId
    );


    // ======================================
    // Start Timer
    // ======================================

    const startTime =
        Date.now();


    // ======================================
    // Log Incoming Request
    // ======================================

    console.log(
        `[REQUEST] ${requestId} | ` +
        `${req.method} ${req.originalUrl}`
    );


    // ======================================
    // When Response Finishes
    // ======================================

    res.on("finish", () => {

        const duration =
            Date.now() - startTime;


        console.log(
            `[RESPONSE] ${requestId} | ` +
            `${res.statusCode} | ` +
            `${duration}ms`
        );

    });


    next();
}


// ==========================================
// Export
// ==========================================

module.exports = {
    requestLogger
};