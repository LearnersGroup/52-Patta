const express = require("express");
var cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Sentry = require("@sentry/node");
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
const { startGame, placeBid, passBid, selectPowerHouse, selectPartners, playCard, requestGameState, nextRound, quitGame } = require("./socket_handlers/game_play/");
require('dotenv').config()

// Initialize Sentry error tracking (only if DSN is configured)
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
}

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

        //game-play
        socket.on("game-start", startGame(socket, io));
        socket.on("game-place-bid", placeBid(socket, io));
        socket.on("game-pass-bid", passBid(socket, io));
        socket.on("game-select-powerhouse", selectPowerHouse(socket, io));
        socket.on("game-select-partners", selectPartners(socket, io));
        socket.on("game-play-card", playCard(socket, io));
        socket.on("game-request-state", requestGameState(socket, io));
        socket.on("game-next-round", nextRound(socket, io));
        socket.on("game-quit", quitGame(socket, io));
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
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

// Init Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://www.gravatar.com"],
            connectSrc: ["'self'", "wss:", "ws:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, // needed for gravatar images
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
    },
}));
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

// Health check endpoint for load balancers, Docker, and uptime monitoring
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    };

    try {
        const dbState = require('mongoose').connection.readyState;
        // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        health.database = dbState === 1 ? 'connected' : 'disconnected';
        if (dbState !== 1) {
            health.status = 'degraded';
            return res.status(503).json(health);
        }
    } catch {
        health.database = 'error';
        health.status = 'degraded';
        return res.status(503).json(health);
    }

    res.status(200).json(health);
});

// Sentry error handler (must be after routes, before other error handlers)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

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
