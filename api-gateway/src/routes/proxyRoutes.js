const { createProxyMiddleware } = require('http-proxy-middleware');
const SERVICES = require('../config/services')

const userServiceProxy = createProxyMiddleware({
    target: SERVICES.USER_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/users': '',
    },
    on: {
        proxyReq: (proxyReq, req) => {
            //Forward authenticated user info to downstream service
            if(req.user){
                proxyReq.setHeader('X-User', req.user.username);
                proxyReq.setHeader('X-User-Role', req.user.role);
            }
        },
    },
});

const orderServiceProxy = createProxyMiddleware({
    target: SERVICES.ORDER_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/orders': '',
    },
    on: {
        proxyReq: (proxyReq, req) => {
            if (req.user) {
                proxyReq.setHeader('X-User', req.user.username);
                proxyReq.setHeader('X-User-Role', req.user.role);
            }
        },
    },
});

module.exports = {
    userServiceProxy,
    orderServiceProxy,
}