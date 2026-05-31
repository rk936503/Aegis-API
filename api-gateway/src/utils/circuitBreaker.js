const CircuitBreaker = require('opossum');
const axios = require('axios');
const { circuitBreakerState } = require('./metrics');

const defaultOptions = {
    timeout: 5000,                 // If request takes > 5s, count as failure
    errorThresholdPercentage: 50,  // Open circuit when 50% of requests fail
    resetTimeout: 10000,           // After 10s in open state, try half-open
    volumeThreshold: 5,            // Need at least 5 requests before tripping
};

/**
 * Creates a circuit breaker wrapped proxy function for a service.
 * @param {string} serviceName - Name for logging/metrics (e.g. 'user-service')
 * @param {string} serviceUrl  - Base URL of the downstream service
 * @returns {{ breaker: CircuitBreaker, handler: Function }}
 */
function createServiceBreaker(serviceName, serviceUrl) {

    // The actual HTTP call the circuit breaker wraps
    const serviceCall = async ({ method, path, headers, body }) => {
        const url = `${serviceUrl}${path}`;
        const response = await axios({
            method,
            url,
            headers,
            data: body,
            timeout: 5000,
        });
        return { status: response.status, data: response.data, headers: response.headers };
    };

    const breaker = new CircuitBreaker(serviceCall, {
        ...defaultOptions,
        name: serviceName,
    });

    // Log state changes + update Prometheus gauge
    breaker.on('open', () => {
        console.warn(`[${serviceName}] Circuit OPEN — failing fast`);
        circuitBreakerState.set({ service: serviceName }, 1);
    });

    breaker.on('halfOpen', () => {
        console.info(`[${serviceName}] Circuit HALF-OPEN — testing recovery...`);
        circuitBreakerState.set({ service: serviceName }, 2);
    });

    breaker.on('close', () => {
        console.info(`[${serviceName}] Circuit CLOSED — service recovered`);
        circuitBreakerState.set({ service: serviceName }, 0);
    });

    breaker.on('fallback', () => {
        console.warn(`[${serviceName}] Fallback triggered`);
    });

    // Express request handler — replaces http-proxy-middleware
    const handler = async (req, res) => {
        try {
            const forwardHeaders = {
                'content-type': req.headers['content-type'] || 'application/json',
            };
            if (req.user) {
                forwardHeaders['x-user']      = req.user.username;
                forwardHeaders['x-user-role'] = req.user.role;
            }

            // Strip the gateway prefix so the downstream service sees the correct path
            // e.g. /api/users/profile  →  /profile
            //      /api/orders/123     →  /123
            const strippedPath = req.originalUrl.replace(/^\/api\/(users|orders)/, '');

            const result = await breaker.fire({
                method:  req.method,
                path:    strippedPath || '/',
                headers: forwardHeaders,
                body:    req.body,
            });

            res.status(result.status).json(result.data);

        } catch (err) {
            if (err.message === 'Breaker is open') {
                return res.status(503).json({
                    error:      'Service temporarily unavailable',
                    service:    serviceName,
                    retryAfter: defaultOptions.resetTimeout / 1000,
                });
            }
            console.error(`[${serviceName}] Proxy error:`, err.message);
            res.status(502).json({ error: 'Bad Gateway' });
        }
    };

    return { breaker, handler };
}

module.exports = { createServiceBreaker };
