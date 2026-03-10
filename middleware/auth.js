const jwt = require("jsonwebtoken");
require('dotenv').config()

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // check for no token
    if(!token){
        return res.status(401).json({msg: "no token, Authorization denied"})
    }

    // verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ msg: 'Token is not valid', code: 'TOKEN_INVALID' });
    }
}