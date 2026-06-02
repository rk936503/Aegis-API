const client = require('prom-client');

client.collectDefaultMetrics();

// Total request counter — by method, route, status
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Response latency histogram — buckets in seconds
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Counter for rate-limited requests — labelled by IP
const rateLimitedTotal = new client.Counter({
  name: 'rate_limited_requests_total',
  help: 'Total number of rate-limited requests',
  labelNames: ['ip'],
});

// Gauge for circuit breaker state: 0=closed, 1=open, 2=half-open
const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state: 0=closed, 1=open, 2=half-open',
  labelNames: ['service'],
});

module.exports = {
  client,
  httpRequestsTotal,
  httpRequestDuration,
  rateLimitedTotal,
  circuitBreakerState,
};