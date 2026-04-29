const { httpRequestsTotal } = require('../utils/metrics');

module.exports = (req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
    });
  });

  next();
};