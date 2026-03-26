# 52-Patta: Project Roadmap & Task Board

> This file tracks all planned work across the project. Tasks are organized by priority epic.
> Migrate to Jira when Atlassian is connected.
>
> **Legend:** `[ ]` TODO | `[~]` IN PROGRESS | `[x]` DONE

---

## EPIC 1: Security Fixes [P1 - Critical]

> Fix committed credentials, harden Docker images, add HTTPS. Must be done before any public deployment.

- [x] Remove `.env` from git tracking and add to `.gitignore`
- [x] Create `.env.example` with all required environment variables documented
- [ ] Rotate MongoDB credentials on Atlas (replace `bako/bako`)
- [x] Rotate JWT secret (replace `@123qwertY`)
- [x] Pin Docker base images to LTS versions (e.g., `node:20-alpine`)
- [x] Replace `nodemon` with `node server.js` in production server Dockerfile CMD
- [x] Serve React production build with nginx or `serve` instead of `react-scripts start`
- [x] Set up SSL/TLS with Let's Encrypt + nginx reverse proxy
- [x] Review and harden security headers (Helmet config audit)

---

## EPIC 2: Refactor for Extensibility [P2 - High]

> Extract game engine into a plugin architecture so new games (MendiKot, Kachuful) can be added cleanly.
> **Depends on:** EPIC 1

- [ ] Design a base game interface/contract (phases, events, state shape)
- [ ] Build a game registry that maps game types to their engines
- [ ] Extract KaliTiri-specific socket handlers into a game-specific handler module
- [ ] Create shared socket handler patterns (room management, state broadcast)
- [x] Formalize the phase state machine → promoted to **EPIC 18**
- [ ] Add TypeScript to game engine (incremental adoption)
- [ ] Write game engine unit tests: `deck.js`
- [ ] Write game engine unit tests: `bidding.js`
- [ ] Write game engine unit tests: `tricks.js`
- [ ] Write game engine unit tests: `scoring.js`
- [ ] Write game engine unit tests: `powerhouse.js`
- [ ] Write game engine unit tests: `validators.js`
- [ ] Add integration tests for full game flow (deal -> bid -> play -> score)
- [ ] Clean up debug code (remove Developer Tools section from home page)
- [ ] Add ESLint configuration to backend

---

## EPIC 3: Documentation [P3 - High]

> Create comprehensive documentation for the project's current state.
> **Depends on:** EPIC 2 (architecture should be stable before documenting)

- [x] System architecture diagram (client, server, DB, Socket.io flow) — `docs/architecture.md`
- [x] Socket event catalog (all client/server events with payload schemas) — `docs/socket-events.md`
- [x] Game engine module diagram (config, deck, bidding, tricks, scoring, powerhouse) — `docs/game-engine.md`
- [x] REST API endpoint documentation (routes, request/response shapes) — `docs/api-endpoints.md`
- [x] Game state flow diagram (lobby -> bidding -> powerhouse -> playing -> scoring) — `docs/game-flow.md`
- [x] Data model documentation (User, Game, in-memory gameState) — `docs/data-models.md`
- [x] Dev setup guide (local dev, mock server, integration tests) — `docs/dev-setup.md`
- [x] Contributing guide (coding standards, PR process, testing expectations) — `docs/contributing.md`

---

## EPIC 4: DevOps - DEV/STG/PROD Split [P4 - High]

> Professional deployment pipeline with environment separation, IaC, and monitoring.
> **Depends on:** EPIC 1 (security), EPIC 3 (documentation)

- [x] Create `docker-compose.yml` for local development
- [x] Create environment-specific config files (dev / staging / prod) — `env/dev.env`, `env/staging.env.example`, `env/prod.env.example`
- [x] Update CI/CD pipeline: add lint -> test -> build steps before deploy — `.github/workflows/ci.yml`
- [x] Add auto-deploy on merge to `main` (staging environment) — `.github/workflows/deploy-staging.yml`
- [x] Add auto-deploy on tag/release (production environment) — `.github/workflows/deploy-prod.yml`
- [x] Infrastructure as Code with Terraform (AWS EC2, VPC, security groups) — `terraform/`
- [ ] Set up staging environment (separate EC2 instance or ECS) — **manual: run `terraform apply`**
- [x] Add health check endpoint (`GET /health` with DB connectivity check)
- [x] Set up error tracking (Sentry) — integrated in `server.js`, **manual: create Sentry project, add `SENTRY_DSN` to env**
- [x] Set up log aggregation — `config/logger.js` outputs JSON lines for CloudWatch/ELK, **manual: configure CloudWatch agent on EC2**
- [x] Add uptime monitoring — `scripts/health-check.sh` for cron/UptimeRobot, **manual: configure monitoring service pointing to `GET /health`**

---

## EPIC 5: SSO Authentication [P5 - Medium]

> Add Google and Facebook OAuth alongside existing email/password auth.
> **Depends on:** EPIC 1 (security)

- [x] Add Passport.js with Google OAuth 2.0 strategy
- [x] Update User model with `provider` and `providerId` fields
- [x] Update login/register UI with social sign-in buttons
- [x] Handle account linking (same email across different providers)
- [x] Add Facebook OAuth strategy
  - Create FB app, get `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`
  - Add `FACEBOOK_APP_SECRET` to GitHub Secrets, `FACEBOOK_APP_ID` + `FACEBOOK_CALLBACK_URL` to GitHub Variables
  - Update deploy workflows to sync FB creds to EC2 `.env`
  - Fix: move `require('dotenv').config()` to top of `server.js` so env vars load before passport strategy registration
- [ ] Update JWT payload to include auth provider info

---

## EPIC 6: New Games - MendiKot & Kachuful [P6 - Medium]

> Add two new card games using the plugin architecture from EPIC 2.
> **Depends on:** EPIC 2 (plugin architecture)

### Prerequisites
- [ ] Set up `migrate-mongo` for database schema migrations (needed for User model changes across environments)

### MendiKot
- [ ] Research and document MendiKot rules and game flow
- [ ] Implement MendiKot game engine (config, dealing, tricks, scoring)
- [ ] Implement MendiKot socket handlers
- [ ] MendiKot-specific UI components

### Kachuful (Judgement)
- [ ] Research and document Kachuful rules and game flow
- [ ] Implement Kachuful game engine (config, dealing, bidding, tricks, scoring)
- [ ] Implement Kachuful socket handlers
- [ ] Kachuful-specific UI components

### Shared
- [ ] Add game type selection to room creation UI
- [ ] Update lobby to show game type per room
- [ ] Game-type-specific scoring display components

---

## EPIC 7: UI/UX Improvements [P7 - Medium]

> Polish the user experience with animations, responsiveness, and customization.

- [ ] Responsive design audit and fixes (mobile-friendly web)
- [ ] Card play animations (deal, play, trick collection)
- [ ] Sound effects for game events (card play, bid, trick win)
- [ ] Player avatar customization
- [ ] Theme/color scheme options
- [ ] Lobby chat improvements
- [ ] Game history/replay viewer
- [ ] Loading states and skeleton screens

---

## EPIC 8: Revenue Model [P8 - Low]

> Monetization strategy and implementation.
> **Depends on:** EPIC 6 (multiple games), EPIC 7 (polished UX)

- [ ] Define and document monetization strategy (ads vs subscription vs one-time)
- [ ] Integrate ad SDK (AdMob for mobile, Google AdSense for web)
- [ ] Build premium features (custom card designs, room themes, ad-free)
- [ ] Payment integration (Stripe)
- [ ] Subscription management UI and backend

---

## EPIC 9: Mobile App [P3 - High]

> Native iOS and Android apps.
> **Depends on:** EPIC 2 (clean architecture), EPIC 4 (stable infra), EPIC 5 (SSO), EPIC 17 (Mobile Wireframes)

- [ ] Choose framework (React Native recommended for JS code sharing)
- [ ] Set up React Native project with shared game logic
- [ ] Implement auth screens (login, register, SSO)
- [ ] Implement lobby and room screens
- [ ] Implement game play screen
- [ ] Push notifications for game invites
- [ ] Apple Developer account setup + App Store submission
- [ ] Google Play Console setup + Play Store submission

---

## EPIC 10: TV App [P10 - Future]

> Second-screen experience: phone as controller, TV as shared display.
> **Depends on:** EPIC 9 (mobile app)

- [ ] Design second-screen architecture (pairing, state sync)
- [ ] TV platform SDK integration (tvOS, Android TV)
- [ ] QR code / pairing mechanism between phone and TV
- [ ] TV display components (large card view, scoreboard, game table)

---

## EPIC 11: Friends & Invite System [P11 - Medium]

> Let players build a friends list and invite them directly into game rooms.
> **Depends on:** EPIC 5 (SSO / user accounts), EPIC 4 (stable infra)

- [ ] Friend request flow (send, accept, decline, cancel)
- [ ] Friends list UI (online/offline presence indicators)
- [ ] In-game invite: send a room link / notification to a friend
- [ ] Push / in-app notifications for friend requests and game invites
- [ ] Block / remove friend functionality
- [ ] Backend: friends collection, request state machine, presence tracking
- [ ] Mobile deep-link support for invite URLs (ties into EPIC 9)

---

## EPIC 12: Leaderboard [P12 - Medium]

> Global and friends-only leaderboards to drive engagement and replayability.
> **Depends on:** EPIC 11 (friends), EPIC 6 (multiple games for per-game boards)

- [ ] Define ranking metric (win rate, total wins, ELO-style rating)
- [ ] Backend: aggregate scores per user per game type after each game
- [ ] Global leaderboard API endpoint (paginated, filterable by game type)
- [ ] Friends leaderboard (rank among your friends list)
- [ ] Leaderboard UI component (rank, avatar, name, score, trend arrow)
- [ ] Weekly / all-time toggle
- [ ] Personal stats page (win/loss record, favourite game, best streak)
- [ ] Badges / achievements system (first win, 10-game streak, etc.)

---

## EPIC 13: Migrate off Create React App [P13 - Future]

> CRA is effectively unmaintained and locks 57 dependency vulnerabilities that cannot be patched.
> Migrating to Vite (or Next.js) unblocks all client-side vulnerability fixes and improves DX (faster builds, HMR).
> **Depends on:** none (can be done any time)

- [ ] Evaluate Vite vs Next.js (Vite recommended — minimal migration, keeps SPA architecture)
- [ ] Set up Vite project with React plugin
- [ ] Migrate CRA-specific config (proxy, env vars `REACT_APP_*` → `VITE_*`)
- [ ] Migrate build scripts and Dockerfile
- [ ] Verify all existing functionality works
- [ ] Remove `react-scripts` dependency
- [ ] Run `npm audit` — confirm 57 CRA-locked vulnerabilities are resolved

---

## EPIC 14: Multi-Provider Account Identity [P2 - High]

> Currently, two OAuth providers sharing the same email silently reuse the same account — the `provider` and `providerId` fields are never updated, and there is no record of which providers a user has actually authenticated with. This epic properly models multi-provider identity.
> **Depends on:** EPIC 5 (SSO)

### Backend
- [ ] Replace single `provider`/`providerId` fields on User model with a `linkedProviders` array: `[{ provider, providerId, linkedAt }]`
- [ ] Write a `migrate-mongo` migration to backfill existing users' `provider`/`providerId` into the new `linkedProviders` array
- [ ] Update `findOrCreateUser` in `config/passport.js`: when an existing user signs in via a new provider, append the new provider to `linkedProviders` instead of silently ignoring it
- [ ] Guard against duplicate provider entries (same provider linked twice)
- [ ] Expose a `GET /api/auth/me` endpoint that returns the user's linked providers list
- [ ] Expose a `DELETE /api/auth/providers/:provider` endpoint to unlink a provider (must keep at least one login method)

### Frontend
- [ ] Profile page: show all linked OAuth providers with "connected" badges (Google, Facebook)
- [ ] Profile page: "Connect" button to link an additional provider to existing account
- [ ] Profile page: "Disconnect" button to unlink a provider (disabled if it's the only login method)
- [ ] On login: if same email exists under a different provider, show a clear "This email is already registered via [X]. Sign in with [X] or link accounts." message instead of silent merge

---

## EPIC 15: Username & Avatar System [P2 - High]

> Currently the display name shown in-game is pulled directly from OAuth (`displayName`) or from the email prefix for local accounts — users have no way to set their own identity. Avatars are sourced from OAuth or Gravatar with no customisation. This epic introduces a proper, player-owned identity layer.
> **Depends on:** EPIC 5 (SSO), EPIC 14 (multi-provider identity)

### Data Model
- [ ] Add `username` field to User model: unique, 3–20 chars, alphanumeric + underscores
- [ ] Add `avatarUrl` field to User model to store the player's chosen avatar (replaces implicit `avatar` field)
- [ ] Write a `migrate-mongo` migration to generate a default `username` for all existing users (derived from their `name` or email prefix, deduplicated)

### Backend
- [ ] `GET /api/users/check-username?username=` — real-time availability check endpoint
- [ ] `PATCH /api/users/profile` — update `username` and/or `avatarUrl`
- [ ] Avatar upload: `POST /api/users/avatar` — accept image upload, resize to 256×256, store to S3/local, return URL
- [ ] Enforce username uniqueness at DB level (unique index)
- [ ] On new OAuth registration, auto-generate a username from `displayName` and prompt user to confirm/change on first login
- [ ] Replace all in-game references to `user.name` with `user.username`

### Frontend
- [ ] Username picker screen shown on first OAuth login (pre-filled with suggestion, availability check live)
- [ ] Profile page: edit username field with real-time availability feedback
- [ ] Profile page: avatar upload with preview and crop (square, 256×256)
- [ ] Profile page: option to reset avatar to OAuth provider photo or Gravatar
- [ ] In-game player cards and lobby: display `username` + avatar instead of OAuth display name
- [ ] Game room: show username in chat, scoreboard, and trick history

---

## EPIC 16: Production Environment Setup [P2 - High]

> Staging is fully operational. This epic provisions the production environment end-to-end — a separate EC2 instance, a GitHub `production` environment with its own secrets/variables, SSL on the real domain, and a verified first deploy via the `v*` tag workflow.
> **Depends on:** EPIC 1 (Security), EPIC 4 (DevOps/CI-CD)

### GitHub Environments — Secrets vs Variables Reference

> **Rule of thumb:** If it's sensitive (password, key, secret), use a **Secret**. If it's safe to expose in logs (URL, ID, public key), use a **Variable**. If the value differs between staging and prod, set it at the **environment** level, not repository level.

| Name | Type | Level | Staging value | Prod value |
|---|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | Secret | Repository | same | same |
| `AWS_SECRET_ACCESS_KEY` | Secret | Repository | same | same |
| `EC2_SSH_KEY` | Secret | Repository | same keypair or separate | same or separate |
| `JWT_SECRET` | Secret | Repository | *(rotate per env ideally)* | *(rotate per env ideally)* |
| `MONGO_URI` | Secret | Repository | staging Atlas cluster | prod Atlas cluster |
| `GOOGLE_CLIENT_SECRET` | Secret | Repository | same OAuth app | same OAuth app |
| `FACEBOOK_APP_SECRET` | Secret | Repository | same Facebook app | same Facebook app |
| `STAGING_HOST` | Secret | Repository | staging EC2 IP/hostname | — |
| `PROD_HOST` | Secret | Repository | — | prod EC2 IP/hostname |
| `ECR_REGISTRY` | Variable | Repository | same ECR account | same ECR account |
| `GOOGLE_CLIENT_ID` | Variable | Repository | same OAuth app | same OAuth app |
| `FACEBOOK_APP_ID` | Variable | Repository | same Facebook app | same Facebook app |
| `CLIENT_URL` | Variable | **Environment** | `https://staging.example.com` | `https://example.com` |
| `GOOGLE_CALLBACK_URL` | Variable | **Environment** | `https://staging.example.com/api/oauth/google/callback` | `https://example.com/api/oauth/google/callback` |
| `FACEBOOK_CALLBACK_URL` | Variable | **Environment** | `https://staging.example.com/api/oauth/facebook/callback` | `https://example.com/api/oauth/facebook/callback` |

### GitHub Actions Setup
- [ ] Create a `production` environment in GitHub → Settings → Environments
- [ ] Add environment-level **Variables** to `production`: `CLIENT_URL`, `GOOGLE_CALLBACK_URL`, `FACEBOOK_CALLBACK_URL` (with prod domain values)
- [ ] Add `PROD_HOST` as a repository-level **Secret** (the prod EC2 public IP or DNS)
- [ ] *(Optional)* Add required reviewers to the `production` environment as a manual approval gate before deploy runs

### EC2 Production Instance
- [ ] Launch a new EC2 instance (Amazon Linux 2023, t3.small or larger) tagged `Name=52-patta-production`
- [ ] Install Docker, Docker Compose, AWS CLI, and `git` on the instance (mirror staging bootstrap)
- [ ] Clone the repo into `/app` on the prod instance: `git clone <repo> /app`
- [ ] Create `/app/.env` on the prod instance with all required variables (use `.env.example` as the template)
- [ ] Set `ECR_REGISTRY` in `/app/.env` so `docker-compose.prod.yml` can reference it
- [ ] Attach an IAM role with `ecr:GetAuthorizationToken` + `ecr:BatchGetImage` + `ecr:GetDownloadUrlForLayer` so the instance can pull from ECR without hardcoded keys
- [ ] Open inbound ports: 80 (HTTP), 443 (HTTPS), 22 (SSH, restrict to known IPs)

### Domain & SSL
- [ ] Point the production domain DNS A-record to the prod EC2 Elastic IP
- [ ] SSH into prod EC2 and obtain a Let's Encrypt certificate: `certbot certonly --standalone -d example.com -d www.example.com`
- [ ] Update `nginx/nginx.conf` for the prod domain (server_name, ssl_certificate paths)
- [ ] Verify HTTPS is working before first container deploy

### OAuth Provider Callback URLs
- [ ] Add the prod callback URL to Google Cloud Console → OAuth 2.0 Client → Authorised redirect URIs: `https://example.com/api/oauth/google/callback`
- [ ] Add the prod callback URL to Facebook Developer Portal → Facebook Login → Valid OAuth Redirect URIs: `https://example.com/api/oauth/facebook/callback`
- [ ] Update Facebook App Domains to include the prod domain

### First Production Deploy
- [ ] Verify the `deploy-prod` workflow triggers on `v*` tags and uses the `production` environment
- [ ] Tag and push a release: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] Watch the GitHub Actions run — confirm test → build → ECR push → EC2 deploy all pass
- [ ] Smoke-test the prod URL: home page loads, Google OAuth works, Facebook OAuth works, game lobby works
- [ ] Confirm `docker ps` on prod EC2 shows both `backend` (healthy) and `client` containers running

### Ongoing Operations
- [ ] Set up EC2 instance stop/start schedule (AWS Instance Scheduler or Lambda) to save cost during off-hours if prod traffic is low
- [ ] Configure CloudWatch or a lightweight uptime monitor (e.g., UptimeRobot) to alert on prod outages
- [ ] Document the release process in `CLAUDE.md`: how to cut a version tag and what the deploy-prod workflow does

---

## EPIC 17: Mobile Wireframe & UX Design [P3 - High]

> Define the complete mobile experience before development begins — screen inventory, design system, interactive prototype, and annotated hand-off assets.
> **Depends on:** EPIC 15 (Username & Avatar — identity must be stable before designing profile screens), EPIC 5 (SSO — auth flow screens)

### Discovery & Scope
- [ ] Define full mobile screen inventory (auth, lobby, room creation, gameplay, profile, settings, leaderboard)
- [ ] Audit existing web UI for components that translate to mobile vs. need redesign

### Design System
- [ ] Define mobile design tokens: color palette, typography scale, spacing, border radii
- [ ] Design core component library (buttons, cards, inputs, modals, nav bar, tab bar)
- [ ] Document touch target minimums and accessibility requirements (WCAG 2.1 AA)

### Wireframes (Figma)
- [ ] Auth flow: splash, login, register, OAuth screens
- [ ] Lobby: room list, create room, join room
- [ ] Gameplay: card hand, trick area, bidding UI, scoreboard overlay
- [ ] Profile: avatar, username, linked providers, stats
- [ ] Settings: notifications, theme, account

### Prototype & Validation
- [ ] Link screens into a clickable Figma prototype for the core game flow
- [ ] Run at least 2 informal usability tests with target users
- [ ] Incorporate feedback and finalize designs

### Hand-off
- [ ] Annotate all screens with spacing, component specs, and interaction notes
- [ ] Export design tokens as a JSON file for use in React Native theme
- [ ] Share Figma link in `docs/mobile-design.md`

---

## EPIC 18: Formalize Phase State Machine [P2 - High]

> Replace ad-hoc `gameState.phase = "..."` mutations scattered across ~15 handler files with a centralized, validated finite state machine (FSM). Prevents invalid transitions, eliminates phantom phases (e.g. `"scoring"` defined client-side but never emitted by server — caused the scoreboard bug), and makes the game flow auditable from a single file.
> **Depends on:** none (server-only refactor)
> **Client impact:** None — same phase strings emitted at the same times. Zero mobile/web changes required.

### Context: Phase Inventory

**Kaliteri:** `shuffling → dealing → bidding → powerhouse → playing → finished → (next game or series-finished)`
- Special: `bidding → shuffling` (all-pass redeal)

**Judgement:** `trump-announce → shuffling → dealing → bidding → playing → finished → (next round or series-finished)`

**Ghost phase:** `"scoring"` is defined in the client Redux slice but never emitted by the server. The server goes directly from trick completion → `onRoundEnd()` → `"finished"`. This mismatch caused the round-end scoreboard to never display for Judgement.

### Context: Files That Mutate Phase Today

| File | Mutations |
|------|-----------|
| `game_engine/strategies/kaliteri.js` | `buildInitialState()` → `"shuffling"`, `nextRound()` → `"shuffling"` |
| `game_engine/strategies/judgement.js` | `buildInitialState()` → `"trump-announce"`, `onRoundEnd()` → `"finished"` or `"series-finished"` |
| `socket_handlers/game_play/dealCardsHandler.js` | `"shuffling"` → `"dealing"`, then `"dealing"` → `"bidding"` via timer |
| `socket_handlers/game_play/placeBid.js` | `"bidding"` → `"powerhouse"` |
| `socket_handlers/game_play/passBid.js` | `"bidding"` → `"powerhouse"` or `"bidding"` → `"shuffling"` (all-pass) |
| `socket_handlers/game_play/helpers/expireBidding.js` | `"bidding"` → `"powerhouse"` or `"bidding"` → `"shuffling"` (no bids) |
| `socket_handlers/game_play/selectPartners.js` | `"powerhouse"` → `"playing"` |
| `socket_handlers/game_play/playCard.js` | `"playing"` → `"finished"` via `onRoundEnd()` |
| `socket_handlers/game_play/autoNextGame.js` | `"finished"` → `"shuffling"` or `"finished"` → `"series-finished"` |
| `socket_handlers/game_play/judgementBid.js` | `"bidding"` → `"playing"` |
| `socket_handlers/game_play/acknowledgeTrumpAnnounce.js` | `"trump-announce"` → `"shuffling"` |
| `socket_handlers/game_play/helpers/autoNextJudgementRound.js` | `"finished"` → `"trump-announce"` or `"finished"` → `"series-finished"` |

### Task 1: Create Phase Constants & Transition Engine

- [ ] Create `game_engine/phases.js` with:
  - Frozen phase constants: `SHUFFLING`, `DEALING`, `BIDDING`, `POWERHOUSE`, `PLAYING`, `FINISHED`, `SERIES_FINISHED`, `TRUMP_ANNOUNCE`
  - No `SCORING` — it was never a real server phase
  - Named event constants for every trigger (see tasks 2 & 3 below)
- [ ] Define Kaliteri transition table: `{ [currentPhase]: { [event]: nextPhase } }`
- [ ] Define Judgement transition table: same structure, different transitions
- [ ] Implement `transition(gameState, event)` function:
  - Selects table based on `gameState.gameType`
  - Looks up `[gameState.phase][event]`
  - Throws descriptive error if transition is invalid (includes current phase, event, and valid events for that phase)
  - Returns the new phase string (pure function, does not mutate)

### Task 2: Map Kaliteri Transitions (11 transitions)

- [ ] `SHUFFLE_COMPLETE`: `shuffling → dealing` — `dealCardsHandler.js:53`
- [ ] `DEAL_COMPLETE`: `dealing → bidding` — `dealCardsHandler.js:87` via `transitionToBidding()`
- [ ] `BID_WON`: `bidding → powerhouse` — `placeBid.js:48-61` (bid hits max or 1 player left)
- [ ] `BID_WON`: `bidding → powerhouse` — `passBid.js:91-103` (all but one pass)
- [ ] `BID_EXPIRED_WITH_WINNER`: `bidding → powerhouse` — `expireBidding.js:60-77`
- [ ] `ALL_PASS_NO_BIDS`: `bidding → shuffling` — `passBid.js:57` (redeal)
- [ ] `BID_EXPIRED_NO_BIDS`: `bidding → shuffling` — `expireBidding.js:32` (redeal)
- [ ] `PARTNERS_SELECTED`: `powerhouse → playing` — `selectPartners.js:52`
- [ ] `ROUND_COMPLETE`: `playing → finished` — `playCard.js:73-83` via `onRoundEnd()`
- [ ] `SCOREBOARD_DONE`: `finished → shuffling` — `autoNextGame.js:51` (next game)
- [ ] `SERIES_COMPLETE`: `finished → series-finished` — `autoNextGame.js:123` (all games done)

### Task 3: Map Judgement Transitions (7 transitions)

- [ ] `TRUMP_ANNOUNCED`: `trump-announce → shuffling` — `acknowledgeTrumpAnnounce.js:28` or auto-timer
- [ ] `SHUFFLE_COMPLETE`: `shuffling → dealing` — `dealCardsHandler.js:53`
- [ ] `DEAL_COMPLETE`: `dealing → bidding` — `dealCardsHandler.js:87`
- [ ] `ALL_BIDS_IN`: `bidding → playing` — `judgementBid.js:28-32`
- [ ] `ROUND_COMPLETE`: `playing → finished` — `playCard.js:73-83` via `onRoundEnd()`
- [ ] `ROUND_COMPLETE`: `playing → series-finished` — `judgement.js:161` (last round)
- [ ] `SCOREBOARD_DONE`: `finished → trump-announce` — `autoNextJudgementRound.js:99-100`

### Task 4: Replace All Direct Mutations

- [ ] `dealCardsHandler.js` — replace `gameState.phase = "dealing"` and bidding transition
- [ ] `placeBid.js` — replace `gameState.phase = "powerhouse"`
- [ ] `passBid.js` — replace both `"powerhouse"` and `"shuffling"` mutations
- [ ] `expireBidding.js` — replace both `"powerhouse"` and `"shuffling"` mutations
- [ ] `selectPartners.js` — replace `gameState.phase = "playing"`
- [ ] `playCard.js` — replace scoring phase transition
- [ ] `autoNextGame.js` — replace `"shuffling"` and `"series-finished"` mutations
- [ ] `judgementBid.js` — replace `"playing"` mutation
- [ ] `acknowledgeTrumpAnnounce.js` — replace `"shuffling"` mutation
- [ ] `autoNextJudgementRound.js` — replace `"trump-announce"` and `"series-finished"` mutations
- [ ] `kaliteri.js` strategy — replace `buildInitialState()` and `nextRound()` phase sets
- [ ] `judgement.js` strategy — replace `buildInitialState()` and `onRoundEnd()` phase sets
- [ ] `startGame.js` — verify it delegates to strategy (no direct mutation)

### Task 5: Client Cleanup

- [ ] Remove `"scoring"` from phase comment in `mobile/src/redux/slices/game.js:20`
- [ ] Grep web client (`client/`) for any `"scoring"` phase references and remove
- [ ] Audit all client-side phase checks (`GameBoard.js`, `BiddingPanel.js`, `JudgementBiddingPanel.js`, etc.) to confirm they only reference real phases

### Task 6: Unit Tests

- [ ] Test Kaliteri transition table: every valid transition returns correct phase
- [ ] Test Kaliteri transition table: invalid transitions throw with descriptive message
- [ ] Test Judgement transition table: every valid transition returns correct phase
- [ ] Test Judgement transition table: invalid transitions throw with descriptive message
- [ ] Test edge case: Kaliteri all-pass redeal loop (`bidding → shuffling → dealing → bidding`)
- [ ] Test edge case: Judgement last round goes to `series-finished` not `finished`

### Task 7: Integration / Smoke Tests

- [ ] Full Kaliteri game flow: shuffle → deal → bid → powerhouse → play → finish → next game → finish → series-finished
- [ ] Kaliteri all-pass redeal: bid → all pass → reshuffle → deal → bid again
- [ ] Kaliteri bid expiry: timer expires with winner → powerhouse; timer expires no bids → reshuffle
- [ ] Full Judgement game flow: trump-announce → shuffle → deal → bid → play → finish → next round → ... → series-finished
- [ ] Play one full Kaliteri series on mobile — verify no regressions
- [ ] Play one full Judgement series on mobile — verify no regressions

---

## Dependency Graph

```
EPIC 1 (Security) ──┬──> EPIC 2 (Refactor) ──> EPIC 3 (Docs) ──> EPIC 4 (DevOps)
                     │                │
                     │                └──> EPIC 6 (New Games) ──> EPIC 8 (Revenue)
                     │
                     └──> EPIC 5 (SSO) ──> EPIC 14 (Multi-Provider Identity) ──> EPIC 15 (Username & Avatar)
                                │                                                         │
                                │                                              EPIC 17 (Mobile Wireframes)
                                │                                                         │
                                └──> EPIC 11 (Friends & Invite) ──> EPIC 12 (Leaderboard)│
                                │                                                         │
                     EPIC 4 (DevOps)──> EPIC 16 (Prod Setup) ──────────────────> EPIC 9 (Mobile) ──> EPIC 10 (TV)

EPIC 7 (UI/UX) can run in parallel with EPICs 4-6
EPIC 13 (Migrate off CRA) can run any time — recommended before EPIC 9 to share Vite config
EPIC 15 (Username & Avatar) feeds into EPIC 11 (Friends), EPIC 12 (Leaderboard), and EPIC 17 (Mobile Wireframes)
EPIC 16 (Prod Setup) must be complete before any public launch or mobile app release
EPIC 17 (Mobile Wireframes) must be complete before EPIC 9 (Mobile App) development begins
EPIC 18 (Phase FSM) has no dependencies — can run any time. Recommended before EPIC 6 (New Games) to give new game engines a clean FSM contract
```
