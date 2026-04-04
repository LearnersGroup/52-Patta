# 52 Patta — Claude Code Instructions

## Project Overview

52 Patta is a real-time multiplayer Indian card game platform supporting two game modes: **Kaliteri** (team bidding game) and **Judgement** (trick-count bidding game). The platform has three clients: a React web app, a React Native (Expo) mobile app, and a Node.js/Express backend with Socket.IO for real-time gameplay.

**Production URL:** https://52patta.in
**Deep link scheme:** `patta52://`

## Architecture

```
React Web Client (CRA)  ─┐
                          ├─→ nginx (SSL, static, proxy) ─→ Express.js (:4000)
React Native (Expo)      ─┘                                      │
                                                    MongoDB + In-Memory Game State
                                                    Socket.IO (real-time events)
```

- **Backend:** Express.js + Socket.IO + Mongoose (MongoDB)
- **Web client:** Create React App, Redux Toolkit, Socket.IO client, SCSS
- **Mobile:** Expo 55 + Expo Router (file-based), Redux Toolkit, Socket.IO client, Reanimated 4
- **Infra:** Docker, nginx, AWS EC2 (Terraform), GitHub Actions CI/CD
- **Auth:** JWT (30-day expiry, `x-auth-token` header) + Google/Facebook OAuth via Passport.js

## Project Structure

```
server.js                    # Express + Socket.IO entry point
routes/api/                  # REST endpoints (auth, users, games, game-rooms, oauth, mygame)
middleware/                  # JWT auth (HTTP + WebSocket)
models/                      # Mongoose schemas (User, Game)
socket_handlers/             # Real-time event handlers
  game_room/                 #   Room management (create, join, leave, ready, kick, config)
  game_play/                 #   Gameplay (bid, play card, powerhouse, partners, shuffle, deal)
  extra/                     #   Connection lifecycle (connect, disconnect, reconnect, chat)
game_engine/                 # Core game logic
  strategies/                #   Strategy pattern: kaliteri.js, judgement.js
  config.js                  #   Dynamic game config (players, decks, bids, points)
  deck.js                    #   Deck creation, shuffle (crypto RNG), deal
  bidding.js                 #   Non-sequential open bidding engine
  tricks.js                  #   Trick resolution, suit-following, valid plays
  powerhouse.js              #   Trump selection + partner mechanics (Kaliteri)
  scoring.js                 #   Point accumulation
  stateManager.js            #   In-memory game state + MongoDB checkpoints
  gameRegistry.js            #   Strategy pattern registry
lib/                         # Shared utilities (avatarUtils, linkNonce)
config/                      # DB connection, logger, Passport OAuth config
migrations/                  # MongoDB migrations (migrate-mongo)
client/                      # React web app (CRA)
  src/
    api/                     #   Axios client, Socket.IO emitters & listeners
    redux/slices/            #   game.js (~70 fields), alert.js
    components/
      gamePage/              #   GamePage, GameBoard, PlayerHand, card utils
      homePage/              #   Lobby, room list
      authPage/              #   Login, register, OAuth callback, onboarding
      shared/                #   CircularTable, PlayArea, PlayerSeat
      hooks/                 #   useAuth (context + localStorage), useLocalStorage
    styles/                  #   30+ SCSS partials (_variables, _mixins, _mobile last)
mobile/                      # React Native (Expo) app
  app/                       #   Expo Router file-based routes
    _layout.js               #     Root: Redux Provider, AuthProvider, fonts, toast
    index.js                 #     Home: join by code, create room, games list
    login.js, register.js    #     Auth screens
    create-user.js           #     Onboarding (username + avatar)
    profile.js               #     User profile
    oauth-callback.js        #     Deep-link OAuth handler
    game-room/[id].js        #     Active game room (lobby + game board)
    game-room/new.js         #     Create room form
    rules/[game].js          #     Rules screens (kaliteri, judgement)
  src/
    redux/slices/            #   game.js, alert.js, preferences.js
    hooks/                   #   useAuth (AsyncStorage + token refresh), useAppState
    api/                     #   socket.js, wsEmitters, wsGameListeners, apiClient
    components/game/         #   Board components, lobby, card SVGs, animations
terraform/                   # AWS infrastructure (VPC, EC2, EIP, security groups)
nginx/                       # Reverse proxy config (SSL, rate limiting, WebSocket proxy)
scripts/                     # health-check.sh, restart-all.sh
docs/                        # Architecture, socket events, API, game flow, data models, dev setup
```

## Development

### Running locally

```bash
# Option 1: In-memory MongoDB dev server (recommended for quick testing)
node dev-server.js

# Option 2: Mock server (no MongoDB at all, simplified)
node dev-server-mock.js

# Option 3: Full stack with multiple browser clients
bash dev-start.sh          # Starts backend + 4 React clients on ports 3000-3003

# Option 4: Docker (mirrors production)
docker-compose up --build
```

### Running the mobile app

```bash
cd mobile
npx expo start --ios       # iOS simulator
npx expo start             # Expo Go / dev client
```

Mobile connects to `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WS_URL` env vars, or defaults to `https://52patta.in`.

### Environment variables

- Dev defaults: `env/dev.env` (version-controlled, safe)
- Staging/prod templates: `env/staging.env.example`, `env/prod.env.example`
- Required: `JWT_SECRET`, `MONGO_HOST`
- Optional: `SENTRY_DSN`, `CORS_ORIGINS`, OAuth credentials (`GOOGLE_CLIENT_ID`, etc.)

### Running tests

```bash
# Unit tests (Jest)
npm test

# Integration tests (Vitest) — requires MongoDB
npm run test:integration

# Specific unit test file
npx jest tests/security-fixes.test.js
```

### Database migrations

```bash
npm run migrate:up          # Apply pending migrations
npm run migrate:down        # Rollback last migration
npm run migrate:status      # Check migration status
```

Uses `migrate-mongo`. Config reads from `env/dev.env`. Migration files in `migrations/`.

## Git Workflow

**All changes must go through a branch and PR. Never push directly to main.**

```bash
git checkout main && git pull
git checkout -b feat/description    # or fix/, chore/
# ... make changes ...
git push origin feat/description
gh pr create
gh pr merge <number> --merge --delete-branch
```

Branch prefixes: `feat/`, `fix/`, `chore/`, `docs/`

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | PR to main | Unit tests, build client, build Docker images |
| `deploy-staging.yml` | Push to main | Tests, push to ECR, deploy to staging EC2 |
| `deploy-prod.yml` | Tag push `v*` | Tests, push to ECR, deploy to production EC2 |
| `manage-infra.yml` | Manual | Start/stop/status EC2 instances |
| `ship-ios.yml` | Manual | EAS build + TestFlight submission |

CI ignores `mobile/*` and `*.md` changes for server workflows.

## Key Patterns

### Game state flow
- Active game state lives in-memory (`Map` in `stateManager.js`)
- Checkpoints persisted to MongoDB `Game.gameState` on phase transitions and disconnects
- Reconnecting players rehydrate from MongoDB via `rehydrateGame()`

### Socket.IO auth
- JWT passed via `socket.handshake.auth.token` (callback pattern on mobile)
- `ws_auth.js` middleware validates and sets `socket.user`
- 30s lobby grace period on disconnect before removal

### Strategy pattern (game types)
- Each game type (kaliteri, judgement) implements `GameStrategy` interface
- Registered in `gameRegistry.js` at startup; validated for required methods
- Socket handlers call strategy methods, keeping game logic decoupled from transport

### Client state management
- Both web and mobile use Redux Toolkit with near-identical `game` slice (~70+ fields)
- Main update path: `game-state-update` socket event -> `updateGameState` reducer
- Socket listeners registered once per game screen, cleaned up on unmount

### Styling (web client)
- SCSS with modular partials imported in order via `App.scss`
- `_variables.scss`: color palette (deep green felt theme, gold accent)
- `_mixins.scss`: reusable patterns (`@mixin panel`, `@mixin btn-base`)
- `_mobile.scss`: responsive overrides (imported last for cascade)
- Fonts: Cinzel (headings), Lato (body)

## Important Conventions

- **Mobile changelog:** Always update `mobile/CHANGELOG.md` when making any mobile change. Add bullets under the current version section; create new `## x.y.z (date)` header for new versions.
- **Auth header:** JWT tokens go in `x-auth-token` header (not Authorization Bearer).
- **Socket handler wrapping:** All socket handlers use `wrapHandler()` for consistent error handling/logging.
- **Card identity:** Cards are `{ suit, rank, deckIndex }`. Use `cardsEqual` for exact match (same deck copy), `cardsDuplicate` for same card different deck copy, `cardsMatch` for suit+rank only.
- **Health check:** `GET /health` returns uptime, version, DB status. Used by CI, nginx, and monitoring.
- **Graceful shutdown:** Server handles SIGTERM/SIGINT to close HTTP, Socket.IO, and MongoDB (10s timeout).

## Documentation

Detailed docs are in the `docs/` directory:
- `architecture.md` — System overview and component interactions
- `socket-events.md` — Complete real-time event catalog with payloads
- `api-endpoints.md` — REST API reference
- `game-engine.md` — Game mechanics architecture
- `game-flow.md` — State machine for Kaliteri and Judgement
- `data-models.md` — User and Game schemas
- `dev-setup.md` — Local development guide
- `contributing.md` — Code standards and PR process

Also see `SOLUTION_DECISIONS.md` for documented bug fixes and architectural decisions.
