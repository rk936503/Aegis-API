const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
    console.log('Auth service connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis Error:',err.message);
});

module.exports = redis;