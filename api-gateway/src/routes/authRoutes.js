const { createProxyMiddleware } = require('http-proxy-middleware');
const SERVICES = require('../config/services');

module.exports = createProxyMiddleware({
    target: SERVICES.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/auth': '',
    },
    logLevel: 'debug',
});