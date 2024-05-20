const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        let decodedToken = jwt.verify(token, config.get('jwtSecret'));
        socket.user = decodedToken.user;
        next();
    }catch (err){
        next(new Error("Socket authentication error"));
    }
};