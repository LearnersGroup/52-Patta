const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = 'test-secret-key-for-integration-tests';

async function startTestServer() {
    // Set env vars before requiring anything that reads them
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    const app = express();
    app.use(express.json({ extended: false, limit: '10kb' }));

    // Mount routes
    app.use('/api/users', require('../../routes/api/users'));
    app.use('/api/auth', require('../../routes/api/auth'));

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: '*', credentials: true },
    });

    // Socket auth middleware
    const ws_auth_middleware = require('../../middleware/ws_auth');
    io.use(ws_auth_middleware);

    // Socket handlers
    const { setupSocketHandlers } = require('../../server');
    setupSocketHandlers(io);

    // Start on random port
    await new Promise((resolve) => {
        server.listen(0, () => resolve());
    });

    const port = server.address().port;
    return { server, io, port, mongoServer };
}

async function stopTestServer({ server, io, mongoServer }) {
    io.close();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongoServer.stop();
}

async function registerUser(port, { name, email, password }) {
    const res = await fetch(`http://localhost:${port}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!data.token) {
        throw new Error(`Registration failed: ${JSON.stringify(data)}`);
    }
    return data.token;
}

function createSocketClient(port, token, username) {
    return new Promise((resolve, reject) => {
        const socket = ioClient(`http://localhost:${port}`, {
            auth: { token },
            transports: ['websocket'],
            forceNew: true,
        });

        socket.on('connect', () => {
            if (username) {
                socket.emit('username', username);
            }
            // Small delay to let username propagate
            setTimeout(() => resolve(socket), 50);
        });

        socket.on('connect_error', (err) => {
            reject(new Error(`Socket connection failed: ${err.message}`));
        });
    });
}

function waitForEvent(socket, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, handler);
            reject(new Error(`Timeout waiting for event "${eventName}"`));
        }, timeout);

        const handler = (...args) => {
            clearTimeout(timer);
            resolve(args.length === 1 ? args[0] : args);
        };

        socket.once(eventName, handler);
    });
}

/**
 * Wait for a room-message event that matches a predicate.
 * Skips messages that don't match (they may be from earlier actions).
 */
function waitForMessage(socket, predicate, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off('room-message', handler);
            reject(new Error(`Timeout waiting for matching room-message`));
        }, timeout);

        const handler = (msg) => {
            if (predicate(msg)) {
                clearTimeout(timer);
                socket.off('room-message', handler);
                resolve(msg);
            }
        };

        socket.on('room-message', handler);
    });
}

function cleanupSockets(...sockets) {
    for (const socket of sockets) {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    }
}

module.exports = {
    startTestServer,
    stopTestServer,
    registerUser,
    createSocketClient,
    waitForEvent,
    waitForMessage,
    cleanupSockets,
    TEST_JWT_SECRET,
};
