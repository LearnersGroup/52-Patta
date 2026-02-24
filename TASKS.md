# 52-Patta: Project Roadmap & Task Board

> This file tracks all planned work across the project. Tasks are organized by priority epic.
> Migrate to Jira when Atlassian is connected.
>
> **Legend:** `[ ]` TODO | `[~]` IN PROGRESS | `[x]` DONE

---

## EPIC 1: Security Fixes [P1 - Critical]

> Fix committed credentials, harden Docker images, add HTTPS. Must be done before any public deployment.

- [ ] Remove `.env` from git tracking and add to `.gitignore`
- [ ] Create `.env.example` with all required environment variables documented
- [ ] Rotate MongoDB credentials on Atlas (replace `bako/bako`)
- [ ] Rotate JWT secret (replace `@123qwertY`)
- [ ] Pin Docker base images to LTS versions (e.g., `node:20-alpine`)
- [ ] Replace `nodemon` with `node server.js` in production server Dockerfile CMD
- [ ] Serve React production build with nginx or `serve` instead of `react-scripts start`
- [ ] Set up SSL/TLS with Let's Encrypt + nginx reverse proxy
- [ ] Review and harden security headers (Helmet config audit)

---

## EPIC 2: Refactor for Extensibility [P2 - High]

> Extract game engine into a plugin architecture so new games (MendiKot, Kachuful) can be added cleanly.
> **Depends on:** EPIC 1

- [ ] Design a base game interface/contract (phases, events, state shape)
- [ ] Build a game registry that maps game types to their engines
- [ ] Extract KaliTiri-specific socket handlers into a game-specific handler module
- [ ] Create shared socket handler patterns (room management, state broadcast)
- [ ] Formalize the phase state machine (explicit FSM instead of implicit if/else chains)
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

- [ ] System architecture diagram (client, server, DB, Socket.io flow)
- [ ] Socket event catalog (all client/server events with payload schemas)
- [ ] Game engine module diagram (config, deck, bidding, tricks, scoring, powerhouse)
- [ ] REST API endpoint documentation (routes, request/response shapes)
- [ ] Game state flow diagram (lobby -> bidding -> powerhouse -> playing -> scoring)
- [ ] Data model documentation (User, Game, in-memory gameState)
- [ ] Dev setup guide (local dev, mock server, integration tests)
- [ ] Contributing guide (coding standards, PR process, testing expectations)

---

## EPIC 4: DevOps - DEV/STG/PROD Split [P4 - High]

> Professional deployment pipeline with environment separation, IaC, and monitoring.
> **Depends on:** EPIC 1 (security), EPIC 3 (documentation)

- [ ] Create `docker-compose.yml` for local development
- [ ] Create environment-specific config files (dev / staging / prod)
- [ ] Update CI/CD pipeline: add lint -> test -> build steps before deploy
- [ ] Add auto-deploy on merge to `main` (staging environment)
- [ ] Add auto-deploy on tag/release (production environment)
- [ ] Infrastructure as Code with Terraform (AWS EC2, VPC, security groups)
- [ ] Set up staging environment (separate EC2 instance or ECS)
- [ ] Add health check endpoint (`GET /health` with DB connectivity check)
- [ ] Set up error tracking (Sentry or similar)
- [ ] Set up log aggregation (CloudWatch or ELK)
- [ ] Add uptime monitoring (UptimeRobot, Better Uptime, or similar)

---

## EPIC 5: SSO Authentication [P5 - Medium]

> Add Google and Facebook OAuth alongside existing email/password auth.
> **Depends on:** EPIC 1 (security)

- [ ] Add Passport.js with Google OAuth 2.0 strategy
- [ ] Add Facebook OAuth strategy
- [ ] Update User model with `provider` and `providerId` fields
- [ ] Update login/register UI with social sign-in buttons
- [ ] Handle account linking (same email across different providers)
- [ ] Update JWT payload to include auth provider info

---

## EPIC 6: New Games - MendiKot & Kachuful [P6 - Medium]

> Add two new card games using the plugin architecture from EPIC 2.
> **Depends on:** EPIC 2 (plugin architecture)

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

## EPIC 9: Mobile App [P9 - Low]

> Native iOS and Android apps.
> **Depends on:** EPIC 2 (clean architecture), EPIC 4 (stable infra), EPIC 5 (SSO)

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

## Dependency Graph

```
EPIC 1 (Security) ──┬──> EPIC 2 (Refactor) ──> EPIC 3 (Docs) ──> EPIC 4 (DevOps)
                     │                │
                     │                └──> EPIC 6 (New Games) ──> EPIC 8 (Revenue)
                     │
                     └──> EPIC 5 (SSO) ──┐
                                         ├──> EPIC 9 (Mobile) ──> EPIC 10 (TV)
                          EPIC 4 (DevOps)┘

EPIC 7 (UI/UX) can run in parallel with EPICs 4-6
```
