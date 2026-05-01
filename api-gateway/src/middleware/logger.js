const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

module.exports = (req, res, next) => {
    // Use existing request ID from upstream, or generate a new one
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Attach to request object so all downstream code can use it
    req.requestId = requestId;

    // Send it back in the response so the client can reference it
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        logger.info({
            requestId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    })

    next();
};