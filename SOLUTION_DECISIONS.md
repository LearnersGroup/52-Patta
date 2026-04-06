# Solution Decisions

---

## DNS Provider: Route 53 over GoDaddy

### Decision

Use **AWS Route 53** as the DNS provider for `52patta.in` instead of GoDaddy's built-in DNS. GoDaddy remains the domain registrar (renewal payments stay there) but its nameservers are replaced with Route 53's.

### Why Not Just Stay on GoDaddy DNS (free)?

GoDaddy DNS is free with the domain registration, but it requires **manual updates every time the staging IP changes**. The staging EC2 is spun up and down between test cycles — each `terraform destroy` + `terraform apply` allocates a new EIP. That means a GoDaddy DNS update by hand every single time staging is brought back up.

### Two approaches were considered

| Approach | How it works | Monthly cost |
|----------|-------------|-------------|
| GoDaddy DNS + permanent EIP | Keep the same IP forever — set GoDaddy record once, never touch it again. EIP held even when EC2 is destroyed. | $0.005/hr × hours staging is **down** (~$2.40 if down 20 days) |
| **Route 53 (chosen)** | EIP created/destroyed normally with EC2. Terraform automatically creates/removes the Route 53 DNS record on each apply. | **$0.50/month flat, no idle EIP cost** |

These are two independent solutions to the same problem — Route 53 makes a permanent EIP unnecessary because Terraform handles the DNS update automatically on every `terraform apply`. Break-even between the two is ~4 days of downtime per month; beyond that Route 53 is cheaper. Staging is realistically down 20+ days/month.

### What Changes

- Route 53 hosted zone created for `52patta.in`
- GoDaddy nameservers replaced with the 4 AWS nameservers from the hosted zone
- All DNS records (`52patta.in`, `www.52patta.in`, `staging.52patta.in`) live in Route 53
- Terraform creates/destroys the `staging.52patta.in → EIP` record alongside the EC2 — no manual DNS updates ever needed

### Migration Steps (one-time)

1. `aws route53 create-hosted-zone --name 52patta.in` → note the 4 nameservers and zone ID
2. Recreate existing A records in Route 53 (`52patta.in`, `www.52patta.in`, `staging.52patta.in`) before switching nameservers — zero downtime
3. In GoDaddy → DNS → Nameservers → point to the 4 Route 53 nameservers
4. Put the zone ID in `terraform/staging.tfvars` (`route53_zone_id`) — Terraform manages it from here

---

## iOS Versioning Strategy & Staging Infrastructure

### Decision

Switch the EAS build system from **remote** versioning (source of truth in App Store Connect) to **local** versioning (source of truth in `app.json` / git). Introduce a `preview` build profile pointing to staging, and provision a `staging.52patta.in` subdomain via Terraform.

---

### Problem

- `app.json` version was stuck at `1.0.1` while the changelog documented releases up to `1.0.9`, creating a confusing mismatch.
- `appVersionSource: "remote"` meant the canonical version lived outside the repo in App Store Connect — making version history invisible in git.
- Both `preview` and `production` EAS profiles pointed to the same `52patta.in` production backend, so test builds tested against live user data.
- No staging environment existed, making it impossible to validate a build before shipping to TestFlight.

---

### What Changed

#### 1. `appVersionSource` → `"local"` (`mobile/eas.json`)

The version in `app.json` is now the single source of truth. EAS no longer queries App Store Connect for the version — it reads it directly from the file in git.

`autoIncrement: true` is kept on the `production` profile so EAS still auto-increments the iOS `buildNumber` (the integer build counter App Store Connect requires) on every production build. The human-readable **marketing version** (`1.0.9`, `1.1.0`, …) is managed manually in `app.json`.

#### 2. `app.json` and `package.json` versions synced to `1.0.9`

Both files were bumped from `1.0.1` to `1.0.9` to match the actual released version documented in `CHANGELOG.md`.

#### 3. Environment variables per EAS profile (`mobile/eas.json`)

| Profile | `EXPO_PUBLIC_API_URL` | `EXPO_PUBLIC_WS_URL` |
|---------|----------------------|---------------------|
| `preview` | `https://staging.52patta.in/api` | `https://staging.52patta.in` |
| `production` | `https://52patta.in/api` | `https://52patta.in` |

Preview builds now connect to the staging backend. Production builds explicitly connect to production.

#### 4. Submit step gated to `production` profile (`.github/workflows/ship-ios.yml`)

`eas submit` runs only when the chosen profile is `production`. A `preview` build produces an internal-distribution `.ipa` but is never submitted to TestFlight.

#### 5. Staging infrastructure (`terraform/`)

- Added `route53_zone_id`, `create_dns_record`, and `dns_subdomain` variables to `variables.tf`.
- `main.tf` conditionally creates an `aws_route53_record` pointing `<dns_subdomain>.52patta.in` to the environment's EIP.
- `staging.tfvars` sets `create_dns_record = true`, `dns_subdomain = "staging"` — fill in `route53_zone_id` with the hosted zone ID for `52patta.in` before applying.
- `prod.tfvars` leaves `create_dns_record = false` (root domain DNS is managed separately).

Staging is a `t3.micro` spun up only during active testing (~$0.01/hr). Tear it down with `terraform destroy -var-file=staging.tfvars` when not needed.

---

### Release Workflow (going forward)

Before triggering `ship-ios`:

1. Update `app.json` `version` (and `mobile/package.json` `version`) to the new version number.
2. Add a section to `mobile/CHANGELOG.md` (`## x.y.z — YYYY-MM-DD`) documenting what changed.
3. Commit the version bump + changelog entry on a branch → merge to main.
4. Trigger `ship-ios` from GitHub Actions with profile `preview` to verify the build against staging.
5. If staging looks good, trigger `ship-ios` again with profile `production` to ship to TestFlight.

The iOS `buildNumber` in `app.json` does **not** need to be bumped manually — `autoIncrement: true` in the production EAS profile handles it automatically on the EAS servers.

---

A record of bugs encountered, fixes considered, and what was ultimately implemented.

---

## MongoDB: Separate Databases per Environment (same Atlas cluster)

### Decision

Use the **same Atlas cluster** but **different database names** per environment.

```
Production:  mongodb+srv://...@cluster.mongodb.net/52patta
Staging:     mongodb+srv://...@cluster.mongodb.net/52patta-staging
```

### Why not a separate Atlas cluster for staging?

A separate cluster (even free tier M0) adds operational overhead — two clusters to monitor, two connection strings to manage, two sets of Atlas users. The simpler solution is a single cluster with isolated databases. Atlas charges per cluster, not per database.

### How MONGO_HOST differs per environment

The `MONGO_HOST` secret is set separately in each GitHub Actions environment:

| GitHub Environment | `MONGO_HOST` value |
|---|---|
| `production` | `mongodb+srv://user:pass@cluster.mongodb.net/52patta` |
| `staging` | `mongodb+srv://user:pass@cluster.mongodb.net/52patta-staging` |

The deploy workflow syncs `MONGO_HOST` to the server's `.env` file on every deploy.
The staging database (`52patta-staging`) is created automatically by MongoDB Atlas
on first write — no manual setup needed.

### What this means for testing

Anything done on staging (test users, test game rooms, test data) lands in
`52patta-staging` and never touches production data. Destroying the staging
EC2 does not delete the staging database — data persists between staging
test cycles, which is intentional (avoids re-seeding test accounts each time).

---

## Bug: "Failed to Fetch Game Room" on Rapid Ready-Toggle

### Description

A player repeatedly clicking the Ready / Not Ready button in the lobby caused
the game room to display a "failed to fetch game room" error for all players
in the room.

### Root Cause

Two compounding problems:

#### 1. Thundering Herd (primary cause of the error)

Every `user-toggle-ready` socket event triggers this chain:

1. Server handler reads User → reads Game → updates Game in DB
2. Server emits `fetch-users-in-room` to **all players** in the room
3. Every client receives the event and fires an HTTP GET `/api/game-rooms/players`

When one player spams the button, many concurrent socket events land on the
server simultaneously. Each one runs multiple DB queries and triggers every
connected client to fire an HTTP request. The burst of load causes the server
to return `500 Server Error`, which the client surfaces as "failed to fetch
game room".

#### 2. Lost-Update Race Condition (data correctness bug)

The original handler used a read-modify-write pattern:

```js
// Read
const game = await Game.findById(user.gameroom).populate(...);

// Modify in memory
const updatedPlayers = game.players.map((player) => {
    if (player.playerId.id === socket.user.id) {
        player.ready = !player.ready;
    }
    return player;
});

// Write
await Game.findOneAndUpdate({ _id: game.id }, { players: updatedPlayers });
```

If two toggle requests overlap:
- Both reads see `ready = false`
- Both flip to `ready = true` in memory
- Second write overwrites the first
- Net result: the toggle is lost — state ends up wrong regardless of order

---

### Possible Solutions Considered

#### 1. Client-side debounce on the Ready button

Prevent the client from emitting `user-toggle-ready` more than once per 500 ms.

| Pros | Cons |
|------|------|
| Trivial to implement (1–2 lines per component) | Only protects the symptom on that one client |
| Zero regression risk | A bad actor / different client can still spam the server directly |
| Immediate UX improvement | Does not fix the race condition |

#### 2. Atomic MongoDB toggle

Replace the read-modify-write with a single aggregation pipeline update that
toggles the flag in one DB round-trip.

| Pros | Cons |
|------|------|
| Eliminates the lost-update race entirely | Requires MongoDB 4.2+ (aggregation pipeline in `findOneAndUpdate`) |
| Reduces DB ops from 3 to 2 per toggle | Query is slightly more complex to read |
| Localized change — only one file | Does not stop the thundering herd on its own |

#### 3. Server-side rate limiting per user

Track the last toggle timestamp per `socket.user.id` in memory and reject
events that arrive within the cooldown window.

| Pros | Cons |
|------|------|
| Protects the server regardless of the client | In-memory Map is not shared across multiple server instances (not cluster-safe without Redis) |
| Cheap — no DB query | Adds a small amount of per-connection memory |
| Catches any client, not just the web/mobile app | |

#### 4. Push room state via WebSocket (instead of HTTP pull)

Instead of emitting a bare `fetch-users-in-room` signal and having each client
do an HTTP GET, compute and push the full room payload over the socket directly.

| Pros | Cons |
|------|------|
| Removes the HTTP thundering herd entirely | Large refactor — every handler that emits `fetch-users-in-room` must change |
| No HTTP round-trip latency | Larger socket payload per event |
| More real-time feel | Clients that reconnect mid-update miss the push and need explicit re-sync |
| | Two sources of truth (HTTP on mount, WS push on updates) can diverge |

#### 5. Combine approaches 1 + 2 + 3 (what we opted for)

Apply all three targeted fixes without the scope risk of the WebSocket push
refactor.

| Pros | Cons |
|------|------|
| Solves the thundering herd (rate limit stops burst at the source) | Server-side Map is not Redis-backed; not suitable for a multi-instance deploy without further work |
| Fixes the data correctness race condition (atomic toggle) | Debounce on client is still a UX layer only, not a hard guarantee |
| Low regression risk — all changes are localized | |
| No large architectural refactor required | |

The WebSocket push (approach 4) remains the right long-term improvement for
scale but is deferred — the three targeted fixes eliminate the bug under all
realistic usage patterns for this game's room sizes (max ~8 players).

---

### What Was Implemented

**Files changed:**

| File | Change |
|------|--------|
| `client/src/components/gamePage/LobbyView.jsx` | Added `useRef`-based 500 ms debounce on `toggleReady` |
| `mobile/src/components/game/lobby/LobbyView.js` | Same ref-based debounce, replacing the previous async-state-only approach which did not block rapid presses |
| `socket_handlers/game_room/userToggleReady.js` | Server-side 500 ms cooldown per user + atomic aggregation pipeline toggle |

**Key details of the server change:**

- `lastToggleMap` (a `Map<userId, timestamp>`) enforces the cooldown. Memory
  impact is negligible (one entry per active user).
- The aggregation pipeline update replaces the old 3-step read-modify-write
  with a 2-step flow (fetch user → atomic update), removing the lost-update
  window.
- The `populate()` calls on the game document were removed since the handler
  no longer needs to iterate over players in application code — the toggle
  happens entirely in the DB.
