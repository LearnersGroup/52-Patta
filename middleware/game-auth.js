const config = require("config");
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // check for no token
    if(!token){
        return res.status(401).json({msg: "no token, Authorization denied"})
    }

    // verify token
    try {
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        console.log("game auth middle ware", decoded);
        if(!decoded.game){
            return res.status(401).json({msg: 'Game Token not found. Please Join or Create a gameroom'})
        }
        req.game = decoded.game;
        next();
    } catch (error) {
        res.status(401).json({msg: 'Game Token is not valid'})
    }
}