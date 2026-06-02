const { httpRequestsTotal, httpRequestDuration } = require('../utils/metrics');

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route:  req.originalUrl,
      status: res.statusCode,
    };

    // Increment total request counter
    httpRequestsTotal.inc(labels);

    // Record request duration in seconds
    httpRequestDuration.observe(labels, (Date.now() - start) / 1000);
  });

  next();
};