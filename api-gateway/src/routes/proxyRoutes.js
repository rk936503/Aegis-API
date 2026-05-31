const { createServiceBreaker } = require('../utils/circuitBreaker');
const SERVICES = require('../config/services');

// Each call returns { breaker, handler }. We only need the handler here.
const { handler: userServiceHandler  } = createServiceBreaker('user-service',  SERVICES.USER_SERVICE);
const { handler: orderServiceHandler } = createServiceBreaker('order-service', SERVICES.ORDER_SERVICE);

module.exports = { userServiceHandler, orderServiceHandler };