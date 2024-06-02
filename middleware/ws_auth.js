const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        let decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decodedToken.user;
        next();
    }catch (err){
        next(new Error("Socket authentication error"));
    }
};