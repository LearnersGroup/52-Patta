const jwt = require("jsonwebtoken");
require('dotenv').config()

module.exports = (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Socket authentication error: no token provided"));
    }

    if (!process.env.JWT_SECRET) {
        return next(new Error("Socket authentication error: server misconfigured"));
    }

    try {
        let decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decodedToken.user;
        next();
    } catch (err) {
        next(new Error("Socket authentication error"));
    }
};
