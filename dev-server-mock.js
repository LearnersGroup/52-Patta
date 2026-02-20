/**
 * dev-server-mock.js
 * Self-contained development server using in-memory data.
 * No MongoDB required — runs entirely in RAM.
 * Implements the same REST API and Socket.io events as the real server.
 */

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const http      = require('http');
const { Server } = require('socket.io');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const PORT       = process.env.PORT || 4000;
const ORIGINS    = ['http://localhost:3000', 'http://localhost:3001'];

// ─── In-memory stores ──────────────────────────────────
// user:  { id, name, email, password (hashed), gameroom (roomId|null) }
// room:  { id, roomname, roompass (hashed), player_count, admin (userId),
//          players: [{ playerId, ready }] }
const users = new Map();
const rooms = new Map();

// ─── Store helpers ─────────────────────────────────────
const userById    = id   => users.get(id);
const roomById    = id   => rooms.get(id);
const userByEmail = email => { for (const u of users.values()) if (u.email === email) return u; };
const roomByName  = name  => { for (const r of rooms.values()) if (r.roomname === name) return r; };

// ─── JWT helpers ───────────────────────────────────────
const signToken   = id    => jwt.sign({ user: { id } }, JWT_SECRET, { expiresIn: 3600 });
const verifyToken = token => jwt.verify(token, JWT_SECRET);

// ─── REST auth middleware ──────────────────────────────
function auth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });
    try {
        req.user = verifyToken(token).user;
        next();
    } catch {
        res.status(401).json({ msg: 'Token invalid' });
    }
}

// ─── Express ───────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(cors({ origin: ORIGINS, credentials: true }));
app.use(express.json());

/** POST /api/users — register */
app.post('/api/users', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
        return res.status(400).json({
            errors: [{ msg: 'Name, valid email and a password ≥ 6 chars are required', path: 'general' }],
        });
    }
    if (userByEmail(email)) {
        return res.status(400).json({ errors: [{ msg: 'User Already exists', path: 'email' }] });
    }
    const id     = randomUUID();
    const hashed = await bcrypt.hash(password, 10);
    users.set(id, { id, name, email, password: hashed, gameroom: null });
    res.json({ token: signToken(id) });
});

/** POST /api/auth — login */
app.post('/api/auth', async (req, res) => {
    const { email, password } = req.body;
    const user = userByEmail(email);
    if (!user) return res.status(400).json({ errors: [{ msg: 'Invalid Credentials', path: 'email' }] });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ errors: [{ msg: 'Invalid Credentials', path: 'password' }] });
    res.json({ token: signToken(user.id), user_name: user.name });
});

/** GET /api/game-rooms — list all rooms */
app.get('/api/game-rooms', auth, (_req, res) => {
    const list = Array.from(rooms.values()).map(r => ({
        _id:          r.id,
        roomname:     r.roomname,
        player_count: r.player_count,
        admin:        { _id: r.admin, name: userById(r.admin)?.name ?? 'Unknown' },
        players:      r.players,
    }));
    res.json(list);
});

/** GET /api/game-rooms/players?id= — room player state */
app.get('/api/game-rooms/players', auth, (req, res) => {
    const room = roomById(req.query.id);
    if (!room) return res.status(400).json({ errors: [{ msg: 'Room does not exist' }] });
    res.json({
        _id:          room.id,
        roomname:     room.roomname,
        player_count: room.player_count,
        admin:        { _id: room.admin, name: userById(room.admin)?.name ?? 'Unknown' },
        players: room.players.map(p => ({
            _id:      p.playerId + '-slot',
            playerId: { _id: p.playerId, name: userById(p.playerId)?.name ?? 'Unknown' },
            ready:    p.ready,
        })),
    });
});

app.get('/', (_req, res) => res.send('52-Patta Mock Dev Server is up ♠'));

// ─── Socket.io ─────────────────────────────────────────
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: ORIGINS, credentials: true },
});

// Socket auth middleware
io.use((socket, next) => {
    try {
        const decoded = verifyToken(socket.handshake.auth.token);
        socket.user = decoded.user;
        next();
    } catch {
        next(new Error('Socket auth failed'));
    }
});

io.on('connection', socket => {
    console.log(`[ws] connected  ${socket.id}`);

    socket.on('disconnect', () => console.log(`[ws] disconnected ${socket.id}`));

    socket.on('username', name => { socket.username = name; });

    socket.on('message', msg => io.emit('message', msg));

    // ── CREATE ROOM ──────────────────────────────────────
    socket.on('user-create-room', async ({ roomname, roompass, player_count }, cb) => {
        try {
            const user = userById(socket.user.id);
            if (!user)             return cb?.('User not found');
            if (user.gameroom)     return cb?.('Already in a room');
            if (!roomname)         return cb?.('Room name is required');
            if (!roompass || roompass.length < 6) return cb?.('Password must be ≥ 6 chars');
            if (roomByName(roomname)) return cb?.('Room already exists');

            const count = Math.max(2, Math.min(10, parseInt(player_count) || 4));
            const id     = randomUUID();
            const hashed = await bcrypt.hash(roompass, 10);

            const room = { id, roomname, roompass: hashed, player_count: count,
                           admin: socket.user.id, players: [{ playerId: socket.user.id, ready: false }] };
            rooms.set(id, room);
            user.gameroom = id;

            await socket.join(roomname);
            socket.emit('redirect-to-game-room', id, res => {
                if (res?.status === 200) {
                    io.to(roomname).emit('room-message', `${socket.username} created ${roomname}!`);
                    io.to(roomname).emit('fetch-users-in-room');
                }
            });
        } catch (e) { console.error(e); cb?.('Server error'); }
    });

    // ── JOIN ROOM ────────────────────────────────────────
    socket.on('user-join-room', async ({ roomname, roompass }, cb) => {
        try {
            const user = userById(socket.user.id);
            const room = roomByName(roomname);
            if (!room) return cb?.('Room not found');

            const already = room.players.some(p => p.playerId === socket.user.id);
            if (already) {
                await socket.join(roomname);
                socket.emit('redirect-to-game-room', room.id, res => {
                    if (res?.status === 200) {
                        io.to(roomname).emit('room-message', `${socket.username} reconnected!`);
                        io.to(roomname).emit('fetch-users-in-room');
                    }
                });
                return;
            }

            if (user.gameroom)                         return cb?.('Already in a room');
            if (room.players.length >= room.player_count) return cb?.('Room is full');

            const match = await bcrypt.compare(roompass, room.roompass);
            if (!match) return cb?.('Invalid Credentials');

            room.players.push({ playerId: socket.user.id, ready: false });
            user.gameroom = room.id;

            await socket.join(roomname);
            socket.emit('redirect-to-game-room', room.id, res => {
                if (res?.status === 200) {
                    io.to(roomname).emit('room-message', `${socket.username} joined!`);
                    io.to(roomname).emit('fetch-users-in-room');
                }
            });
        } catch (e) { console.error(e); cb?.('Server error'); }
    });

    // ── LEAVE ROOM ───────────────────────────────────────
    socket.on('user-leave-room', async cb => {
        try {
            const user = userById(socket.user.id);
            const room = roomById(user?.gameroom);
            if (!room) return cb?.('Not in a room');

            user.gameroom = null;

            if (room.admin === socket.user.id) {
                // Admin leaves → close room for everyone
                for (const p of room.players) {
                    const u = userById(p.playerId);
                    if (u) u.gameroom = null;
                }
                io.to(room.roomname).emit('redirect-to-home-page');
                rooms.delete(room.id);
                return;
            }

            room.players = room.players.filter(p => p.playerId !== socket.user.id);
            await socket.leave(room.roomname);
            socket.emit('redirect-to-home-page', res => {
                if (res?.status === 200) {
                    io.to(room.roomname).emit('room-message', `${socket.username} left!`);
                    io.to(room.roomname).emit('fetch-users-in-room');
                }
            });
        } catch (e) { console.error(e); cb?.('Server error'); }
    });

    // ── TOGGLE READY ─────────────────────────────────────
    socket.on('user-toggle-ready', cb => {
        try {
            const user = userById(socket.user.id);
            const room = roomById(user?.gameroom);
            if (!room) return cb?.('Not in a room');

            for (const p of room.players) {
                if (p.playerId === socket.user.id) { p.ready = !p.ready; break; }
            }
            io.to(room.roomname).emit('fetch-users-in-room');
        } catch (e) { console.error(e); cb?.('Server error'); }
    });
});

// ─── Start ─────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`♠ 52-Patta mock dev server on port ${PORT} (all data in-memory)`);
});
