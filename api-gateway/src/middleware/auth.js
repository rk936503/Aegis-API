const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

module.exports = async(req, res, next) => {
    const authHeader = req.headers['authorization'];
    if(!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(' ')[1];

    try{
        // Verify the JWT signature and expiry
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        // Check if this token has been blacklisted (user logged out)
        const isBlacklisted = await redis.get(`blacklist:${token}`);
        if(isBlacklisted){
            return res.status(401).json({ errror: "Token revoked. Please login again" });
        }

        // Attach user info to request (used by proxy to set X-User headers)
        req.user = decode;
        next();
    }catch (err){
        if(err.name === 'TokenExpiredError'){
            return res.status(401).json({ error: "Token expired" });
        }
        return res.status(403).json({ error: "Invalid token"});
    }

};