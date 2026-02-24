# System Architecture

> Overview of the 52-Patta system: client, server, database, and real-time communication.

---

## High-Level Architecture

```
                        +-------------------+
                        |   React Client    |
                        | (SPA on port 80)  |
                        +--------+----------+
                                 |
                    REST (HTTP)  |  WebSocket (Socket.IO)
                                 |
                  +--------------+--------------+
                  |                             |
           +------v-------+           +--------v--------+
           |  nginx       |           |  nginx           |
           |  /api/*      |           |  /socket.io/*    |
           +--------------+           +-----------------+
                  |                             |
                  +-------------+---------------+
                                |
                        +-------v--------+
                        |  Express.js    |
                        |  Server (4000) |
                        +-------+--------+
                                |
                  +-------------+-------------+
                  |             |             |
          +-------v--+  +------v-----+  +----v---------+
          | REST API |  | Socket.IO  |  | Game Engine  |
          | Routes   |  | Handlers   |  | (in-memory)  |
          +----------+  +------------+  +--------------+
                  |             |             |
                  +------+------+------+------+
                         |             |
                  +------v------+  +---v-----------+
                  | MongoDB     |  | In-Memory     |
                  | Atlas       |  | Game States   |
                  | (persistent)|  | (stateManager)|
                  +-------------+  +---------------+
```

---

## Component Overview

### Client (React SPA)
- **Framework:** React 18 with Create React App
- **State Management:** Redux (game state, alerts) + React Context (auth) + React Query (API caching)
- **Real-time:** Socket.IO client for game events
- **Routing:** React Router v6 with protected routes
- **Styling:** SCSS

### nginx Reverse Proxy
- **Purpose:** SSL termination, static file serving, request routing
- **Static files:** Serves React build from `/usr/share/nginx/html`
- **API proxy:** Routes `/api/*` to Express backend
- **WebSocket proxy:** Routes `/socket.io/*` to Express backend with upgrade headers

### Express.js Server (Port 4000)
- **Framework:** Express.js 4
- **Security:** Helmet (CSP, HSTS), CORS, rate limiting, JWT auth
- **REST API:** 5 route modules for auth, users, games, game-rooms, mygame
- **WebSocket:** Socket.IO with JWT auth middleware
- **Socket Handlers:** 12 game event types across room management and gameplay

### Game Engine (In-Memory)
- **Architecture:** Modular engine with 8 sub-modules
- **State:** Game states held in a JavaScript Map (in-memory for low-latency)
- **Persistence:** Checkpoints saved to MongoDB at phase transitions and disconnects
- **Recovery:** States can be rehydrated from MongoDB on reconnect or server restart

### MongoDB Atlas
- **ODM:** Mongoose 7
- **Models:** User (accounts), Game (rooms + persisted game state)
- **Connection:** SRV protocol to Atlas cluster

---

## Data Flow

### Authentication Flow
```
Client                    Server                     MongoDB
  |                         |                          |
  |-- POST /api/users ----->|                          |
  |   (register)            |-- Save User ------------>|
  |                         |<-- User doc -------------|
  |                         |-- Sign JWT               |
  |<-- { token } ---------- |                          |
  |                         |                          |
  |-- POST /api/auth ------>|                          |
  |   (login)               |-- Find User ------------>|
  |                         |<-- User doc -------------|
  |                         |-- Verify password        |
  |                         |-- Sign JWT               |
  |<-- { token, name } ---- |                          |
```

### Game Room Flow
```
Client                    Server                     MongoDB
  |                         |                          |
  |== WS Connect ===========>|                         |
  |   (JWT in auth)         |-- Verify JWT             |
  |                         |                          |
  |-- user-create-room ---->|                          |
  |   {roomname, pass, n}   |-- Create Game doc ------>|
  |                         |-- Update User.gameroom ->|
  |<-- redirect-to-game --- |                          |
  |                         |                          |
  |-- user-join-room ------>|                          |
  |   {roomname, pass}      |-- Atomic $push player -->|
  |<-- redirect-to-game --- |                          |
  |                         |                          |
  |-- user-toggle-ready --->|                          |
  |<-- fetch-users-in-room  |                          |
```

### Game Play Flow
```
Client                    Server                  State Manager
  |                         |                          |
  |-- game-start ---------->|                          |
  |   (admin only)          |-- Init game state ------>|
  |                         |-- Deal cards             |
  |<-- game-state-update -- |   (personalized)         |
  |<-- game-phase-change -- |   ("bidding")            |
  |                         |                          |
  |-- game-place-bid ------>|                          |
  |   {amount}              |-- Update bidding ------->|
  |<-- game-state-update -- |                          |
  |                         |                          |
  |-- game-select-powerhouse>|                         |
  |   {suit}                |-- Set trump ------------>|
  |                         |                          |
  |-- game-select-partners ->|                         |
  |   {cards}               |-- Set partners --------->|
  |<-- game-phase-change -- |   ("playing")            |
  |                         |                          |
  |-- game-play-card ------>|                          |
  |   {card}                |-- Validate & play ------>|
  |<-- game-state-update -- |                          |
  |<-- game-trick-result -- |   (when trick complete)  |
  |<-- game-result -------- |   (when game ends)       |
```

---

## Security Layers

| Layer | Implementation |
|-------|---------------|
| Transport | TLS 1.2+ via nginx (Let's Encrypt) |
| Headers | Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Authentication | JWT tokens (1-hour expiry) |
| REST Auth | `x-auth-token` header verified per request |
| WebSocket Auth | JWT verified on connection handshake |
| Rate Limiting | 20 requests / 15 min on auth endpoints |
| Input Validation | express-validator on REST, manual validation on socket events |
| XSS Prevention | HTML tag stripping on usernames and messages |
| Password Storage | bcrypt with salt rounds = 10 |
| CORS | Explicit origin whitelist |
