const CircuitBreaker = require('opossum');
const axios = require('axios');
const { circuitBreakerState } = require('./metrics');

const defaultOptions = {
    // opossum timeout MUST be greater than axios timeout.
    // If opossum fires first, the error counts as 'timeout' (not 'failure') and
    // does NOT contribute to errorThresholdPercentage — the circuit never opens.
    // Setting opossum timeout > axios timeout ensures axios throws AxiosError first,
    // which opossum counts as a genuine 'failure'.
    timeout: 4000,                 // Safety net — must be > axios timeout (2000ms)
    errorThresholdPercentage: 50,  // Open when >= 50% of requests in the window fail
    resetTimeout: 10000,           // After 10s open, try one request (half-open)
    volumeThreshold: 3,            // Only need 3 requests before circuit can trip
    rollingCountTimeout: 30000,    // 30s rolling window — accommodates slow manual testing
    rollingCountBuckets: 10,       // 10 buckets of 3s each within the 30s window
};

/**
 * Creates a circuit breaker wrapped proxy function for a service.
 * @param {string} serviceName - Name for logging/metrics (e.g. 'user-service')
 * @param {string} serviceUrl  - Base URL of the downstream service
 * @returns {{ breaker: CircuitBreaker, handler: Function }}
 */
function createServiceBreaker(serviceName, serviceUrl) {

    // Axios throws AxiosError on timeout → opossum counts it as 'failure' → circuit opens
    const serviceCall = async ({ method, path, headers, body }) => {
        const url = `${serviceUrl}${path}`;
        const response = await axios({
            method,
            url,
            headers,
            data: body,
            timeout: 2000,
        });
        return { status: response.status, data: response.data, headers: response.headers };
    };

    const breaker = new CircuitBreaker(serviceCall, {
        ...defaultOptions,
        name: serviceName,
    });

    // Debug: log every failure so we can confirm opossum is counting
    breaker.on('failure', (err) => {
        console.warn(`[${serviceName}] Failure counted — ${err.message}`);
    });

    // Log state changes + update Prometheus gauge
    breaker.on('open', () => {
        console.warn(`[${serviceName}] ⚡ Circuit OPEN — failing fast`);
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

    // Express request handler — replaces http-proxy-middleware
    const handler = async (req, res) => {
        // Circuit is open — fail fast, no downstream call needed
        if (breaker.opened) {
            return res.status(503).json({
                error:      'Service temporarily unavailable',
                service:    serviceName,
                retryAfter: defaultOptions.resetTimeout / 1000,
            });
        }

        try {
            const forwardHeaders = {
                'content-type': req.headers['content-type'] || 'application/json',
            };
            if (req.user) {
                forwardHeaders['x-user']      = req.user.username;
                forwardHeaders['x-user-role'] = req.user.role;
            }

            // Strip gateway prefix: /api/users/profile → /profile
            const strippedPath = req.originalUrl.replace(/^\/api\/(users|orders)/, '');

            const result = await breaker.fire({
                method:  req.method,
                path:    strippedPath || '/',
                headers: forwardHeaders,
                body:    req.body,
            });

            res.status(result.status).json(result.data);

        } catch (err) {
            // Circuit may have just opened on THIS request — return 503 not 502
            if (breaker.opened) {
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
