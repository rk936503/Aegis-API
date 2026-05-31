const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const SERVICES = require('../config/services');

module.exports = createProxyMiddleware({
    target: SERVICES.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/auth': '',
    },
    on: {
        // Re-serialize the body parsed by express.json() back into the proxy request
        // Without this, express.json() consumes the stream and auth-service gets empty body
        proxyReq: fixRequestBody,
    },
});