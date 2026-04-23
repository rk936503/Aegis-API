const redis = require('../config/redis');
const WINDOW_SIZE = 60;
const MAX_REQUESTS = 5;

module.exports = async(req, res, next) => {
    try {
        const ip = req.ip;
        const key = `rate_limit:${ip}`;

        const current = await redis.incr(key);

        if(current === 1){
            await redis.expire(key, WINDOW_SIZE);
        }
        if(current > MAX_REQUESTS){
            return res.status(429).json({
                errror: 'Too Many Requests, Please try again later.',
            });
        }
        
        next();

    } catch (error) {
        console.error('Rate limiter error: ',error);
        next();
    }
}