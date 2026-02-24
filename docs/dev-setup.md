# Developer Setup Guide

> How to get 52-Patta running locally for development and testing.

---

## Prerequisites

- **Node.js** 20 LTS (recommended) or 18+
- **npm** 9+
- **Git**
- No MongoDB installation needed (in-memory server available)

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/LearnersGroup/52-Patta.git
cd 52-Patta

# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Environment setup

```bash
cp .env.example .env
```

Edit `.env` with your values, or use the defaults for local development with the in-memory server.

### 3. Choose a dev server

There are **three** ways to run the backend:

---

## Option A: In-Memory Dev Server (Recommended for Quick Start)

Uses `mongodb-memory-server` — no external database needed. Data resets on restart.

```bash
node dev-server.js
```

This automatically sets:
- `JWT_SECRET` = `dev-secret-change-in-prod`
- `MONGO_HOST` = in-memory MongoDB URI
- `MONGO_DB_NAME` = `patta_dev`

Then in a separate terminal:
```bash
cd client && npm start
```

**Or run both simultaneously:**
```bash
npm run dev
```

This uses `concurrently` to start the server (with `nodemon` for auto-reload) and the React dev server.

---

## Option B: Mock Dev Server (No Database at All)

A fully self-contained server with in-memory data stores. Implements the REST API and room management socket events (but not full game play).

Good for **frontend UI development** when you don't need the game engine.

```bash
node dev-server-mock.js
```

Then in a separate terminal:
```bash
cd client && npm start
```

---

## Option C: Full Server with Real MongoDB

For testing against a real database (e.g., MongoDB Atlas).

```bash
# Set your .env with real credentials:
# MONGO_HOST=mongodb+srv://user:pass@cluster.mongodb.net/dbname
# JWT_SECRET=your-secret-here

npm run server    # Uses nodemon for auto-reload
```

Then in a separate terminal:
```bash
cd client && npm start
```

---

## Development URLs

| Service | URL |
|---------|-----|
| React App | http://localhost:3000 |
| Express Server | http://localhost:4000 |
| API Base | http://localhost:4000/api |
| Socket.IO | http://localhost:4000 (WebSocket upgrade) |

The React dev server proxies API requests to `localhost:4000` (configured in `client/package.json`).

---

## Available npm Scripts

### Server (root `package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node server` | Production server start |
| `npm run server` | `nodemon server` | Dev server with auto-reload |
| `npm run client` | `npm start --prefix client` | Start React dev server |
| `npm run dev` | `concurrently server + client` | Start both together |
| `npm run socket-dev` | `concurrently server + 2 clients` | Multi-client testing (ports 3000, 3001) |
| `npm test` | `jest` | Run unit/security tests |
| `npm run test:integration` | `vitest run` | Run integration tests |

### Client (`client/package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `react-scripts start` | Dev server with hot reload |
| `npm run build` | `react-scripts build` | Production build |
| `npm test` | `react-scripts test` | Run React tests |

---

## Testing

### Unit / Security Tests (Jest)

```bash
npm test
```

Runs tests in `tests/` directory including:
- `tests/security-fixes.test.js` — Validates security measures
- Game engine unit tests (when added)

### Integration Tests (Vitest)

```bash
npm run test:integration
```

Runs tests in `tests/integration/` using an in-memory MongoDB instance. Tests full flows like game room creation, joining, and game play.

**Test configuration:** `vitest.config.js`
- Timeout: 15 seconds per test
- Pattern: `tests/integration/**/*.test.js`

### Multi-Client Testing

To test multiplayer scenarios locally, run two browser clients:

```bash
npm run socket-dev
```

This opens:
- Client 1 on http://localhost:3000
- Client 2 on http://localhost:3001
- Server on http://localhost:4000

---

## Project Structure

```
52-Patta/
├── server.js               # Main Express + Socket.IO server
├── dev-server.js           # Dev server with in-memory MongoDB
├── dev-server-mock.js      # Standalone mock server (no DB)
├── package.json            # Server dependencies and scripts
├── .env                    # Environment variables (not committed)
├── .env.example            # Template for .env
├── Dockerfile              # Production server container
├── config/
│   └── db.js               # MongoDB connection
├── middleware/
│   ├── auth.js             # REST JWT auth
│   └── ws_auth.js          # WebSocket JWT auth
├── models/
│   ├── User.js             # User schema
│   └── Game.js             # Game room schema
├── routes/api/
│   ├── users.js            # POST /api/users (register)
│   ├── auth.js             # POST/GET /api/auth (login/profile)
│   ├── games.js            # POST /api/games (create room)
│   ├── game-rooms.js       # GET/POST /api/game-rooms
│   └── mygame.js           # GET/DELETE /api/mygame
├── socket_handlers/
│   ├── extra/              # Connection, username, message
│   ├── game_room/          # Create, join, leave, toggle ready
│   └── game_play/          # Start, bid, play, score
├── game_engine/
│   ├── index.js            # Central export
│   ├── config.js           # Game variants
│   ├── deck.js             # Card creation, shuffle, deal
│   ├── bidding.js          # Bidding phase logic
│   ├── powerhouse.js       # Trump and partner selection
│   ├── tricks.js           # Card play and trick resolution
│   ├── scoring.js          # Score calculation
│   ├── validators.js       # Rule validation
│   └── stateManager.js     # In-memory state + persistence
├── tests/
│   ├── security-fixes.test.js
│   └── integration/
├── nginx/
│   └── nginx.conf          # Production reverse proxy config
├── client/
│   ├── package.json
│   ├── Dockerfile          # Multi-stage build (nginx)
│   ├── nginx.conf          # Client nginx config
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── socket.js
│       ├── api/            # REST + Socket emitters/listeners
│       ├── redux/          # State management
│       ├── components/     # React components
│       └── styles/
└── docs/                   # Documentation (you are here)
```

---

## Docker Development

### Build and run server:
```bash
docker build -t 52-patta-server .
docker run -p 4000:4000 --env-file .env 52-patta-server
```

### Build and run client:
```bash
cd client
docker build -t 52-patta-client .
docker run -p 80:80 52-patta-client
```

Note: The client Dockerfile uses a multi-stage build — Node.js for building, nginx for serving.

---

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### MongoDB connection fails
- Use `dev-server.js` or `dev-server-mock.js` to avoid needing a real DB
- If using Atlas: ensure your IP is whitelisted and credentials are correct

### Socket connection issues
- Check that the server is running on port 4000
- Check browser console for WebSocket errors
- Ensure CORS_ORIGINS in `.env` includes your client's URL
