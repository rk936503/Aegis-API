const { createProxyMiddleware } = require('http-proxy-middleware');
const SERVICES = require('../config/services')

const userServiceProxy = createProxyMiddleware({
    target: SERVICES.USER_SERVICE,
    changeOrigin: true,
    // pathRewrite: {
    //     '^/api/users': '/users',
    // },
});

const orderServiceProxy = createProxyMiddleware({
    target: SERVICES.ORDER_SERVICE,
    changeOrigin: true,
    // pathRewrite: {
    //     '^/api/orders': '/orders',
    // },
})

module.exports = {
    userServiceProxy,
    orderServiceProxy,
}