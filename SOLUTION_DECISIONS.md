# Solution Decisions

A record of bugs encountered, fixes considered, and what was ultimately implemented.

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
