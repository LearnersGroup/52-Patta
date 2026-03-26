require('dotenv').config()
const express = require("express");
var cors = require("cors");
const helmet = require("helmet");
const Sentry = require("@sentry/node");
const connectDB = require("./config/db");
const logger = require("./config/logger");
const { Server } = require("socket.io");
const app = express();
const http = require("http");
const Game = require("./models/Game");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const passport = require("./config/passport");
const ws_auth_middleware = require("./middleware/ws_auth");
const {
    userJoinRoom,
    userCreateRoom,
    userLeaveRoom,
    userToggleReady,
    adminUpdateConfig,
    adminKickPlayer,
} = require("./socket_handlers/game_room/");
const { onConnect, setSocketUsername, onDisconnect, onMessage } = require("./socket_handlers/extra");
const { startGame, placeBid, passBid, selectPowerHouse, selectPartners, playCard, requestGameState, nextRound, quitGame, shuffleAction, undoShuffle, dealCardsHandler, judgementBid, acknowledgeTrumpAnnounce, returnToLobby } = require("./socket_handlers/game_play/");

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
        socket.on("admin-update-config", adminUpdateConfig(socket, io));
        socket.on("admin-kick-player", adminKickPlayer(socket, io));

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

        //game-play: shuffling & dealing
        socket.on("game-shuffle-action", shuffleAction(socket, io));
        socket.on("game-undo-shuffle", undoShuffle(socket, io));
        socket.on("game-deal", dealCardsHandler(socket, io));
        socket.on("game-judgement-bid", judgementBid(socket, io));
        socket.on("game-proceed-to-shuffle", acknowledgeTrumpAnnounce(socket, io));
        socket.on("game-return-to-lobby", returnToLobby(socket, io));
    });
}

if (require.main === module) {
    // Validate required environment variables
    const requiredEnvVars = ['JWT_SECRET', 'MONGO_HOST'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            logger.error(`Missing required environment variable: ${envVar}`);
            process.exit(1);
        }
    }

    // Connect DB
    connectDB();
}

// Allowed origins for CORS
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:8081'];

// Init Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://www.gravatar.com", "https://api.dicebear.com"],
            connectSrc: ["'self'", "wss:", "ws:", "https://accounts.google.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            formAction: ["'self'", "https://accounts.google.com", "https://www.facebook.com"],
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
// 2mb covers avatar base64 SVG payloads (~100-500KB); tight enough for everything else.
app.use(express.json({ extended: false, limit: '2mb' }));
app.use(passport.initialize());


//define routes
app.use("/api/users", require("./routes/api/users")); //create user
app.use("/api/auth", require("./routes/api/auth")); //auth user
app.use("/api/games", require("./routes/api/games")); //create game-room
app.use("/api/game-rooms", require("./routes/api/game-rooms")); //
app.use("/api/mygame", require("./routes/api/mygame"));
app.use("/api/oauth", require("./routes/api/oauth"));

app.get('/', (req, res) => {
    res.status(200).send('52 Patta\'s Service is up');
});

// Health check endpoint for load balancers, Docker, and uptime monitoring
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        version: require('./package.json').version,
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
    pingTimeout: 30000,
    pingInterval: 25000,
});
io.use(ws_auth_middleware);

// Websockets
setupSocketHandlers(io);

if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => logger.info('Server started', { port: PORT }));

    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info(`${signal} received, shutting down gracefully`);

        server.close(() => {
            logger.info('HTTP server closed');
        });

        io.close(() => {
            logger.info('Socket.IO server closed');
        });

        try {
            await require('mongoose').connection.close();
            logger.info('MongoDB connection closed');
        } catch (err) {
            logger.error('Error closing MongoDB', { error: err.message });
        }

        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { app, server, io, setupSocketHandlers };
