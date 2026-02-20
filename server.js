const express = require("express");
var cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const app = express();
const http = require("http");
const Game = require("./models/Game");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const ws_auth_middleware = require("./middleware/ws_auth");
const { userJoinRoom, userCreateRoom, userLeaveRoom, userToggleReady } = require("./socket_handlers/game_room/");
const { onConnect, setSocketUsername, onDisconnect, onMessage } = require("./socket_handlers/extra");
require('dotenv').config()

function setupSocketHandlers(io) {
    io.on("connection", (socket) => {
        //extras
        onConnect(socket, io)();
        socket.on("disconnect", onDisconnect(socket, io));
        socket.on("username", setSocketUsername(socket, io));
        socket.on("message", onMessage(socket, io));

        //game-room
        socket.on("user-join-room", userJoinRoom(socket, io));
        socket.on("user-create-room", userCreateRoom(socket, io));
        socket.on("user-leave-room", userLeaveRoom(socket, io));
        socket.on("user-toggle-ready", userToggleReady(socket, io));
    });
}

if (require.main === module) {
    // Validate required environment variables
    const requiredEnvVars = ['JWT_SECRET', 'MONGO_HOST'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.error(`Missing required environment variable: ${envVar}`);
            process.exit(1);
        }
    }

    // Connect DB
    connectDB();
}

// Allowed origins for CORS
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];

// Init Middleware
app.use(helmet());
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({ extended: false, limit: '10kb' }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per window
    message: { errors: [{ msg: "Too many requests, please try again later" }] }
});
app.use("/api/auth", authLimiter);
app.use("/api/users", authLimiter);

//define routes
app.use("/api/users", require("./routes/api/users")); //create user
app.use("/api/auth", require("./routes/api/auth")); //auth user
app.use("/api/games", require("./routes/api/games")); //create game-room
app.use("/api/game-rooms", require("./routes/api/game-rooms")); //
app.use("/api/mygame", require("./routes/api/mygame"));

app.get('/', (req, res) => {
    res.status(200).send('52 Patta\'s Service is up');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});
io.use(ws_auth_middleware);

// Websockets
setupSocketHandlers(io);

if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => console.log(`server started on port ${PORT}`));
}

module.exports = { app, server, io, setupSocketHandlers };
