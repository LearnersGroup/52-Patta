# Socket Event Catalog

> All Socket.IO events exchanged between client and server, with payload schemas and descriptions.

---

## Connection & Authentication

Socket.IO connects with JWT authentication:

```js
// Client-side connection (client/src/socket.js)
io(URL, {
    auth: (cb) => {
        const user = JSON.parse(localStorage.getItem("user"));
        cb({ token: user ? user.token : null });
    }
});
```

Server-side middleware (`middleware/ws_auth.js`) verifies the token and attaches `socket.user` with `{ id }`.

---

## Event Reference

### Legend
| Symbol | Meaning |
|--------|---------|
| C -> S | Client emits, Server receives |
| S -> C | Server emits to one client |
| S -> R | Server broadcasts to room |
| S -> A | Server broadcasts to all |

---

## Connection Events

### `disconnect`
| Direction | C -> S |
|-----------|--------|
| Payload | None (built-in Socket.IO event) |
| Description | Handles player disconnection. **Lobby:** removes player from room, notifies others. **Active game:** persists checkpoint, marks player disconnected, broadcasts to room. |
| Emits | `room-message`, `fetch-users-in-room`, `redirect-to-home-page` (if admin), `game-player-disconnected` (if in-game) |

### `username`
| Direction | C -> S |
|-----------|--------|
| Payload | `username` (string) |
| Validation | Must be string, HTML tags stripped, max 50 chars |
| Description | Sets the socket's display username for chat messages. |

### `message`
| Direction | C -> S |
|-----------|--------|
| Payload | `data` (string) |
| Validation | Must be string, HTML tags stripped, max 1000 chars |
| Description | Broadcasts a chat message to all connected sockets. |
| Emits | `message` (S -> A) with the sanitized message |

---

## Game Room Events

### `user-create-room`
| Direction | C -> S |
|-----------|--------|
| Payload | `{ roomname: string, roompass: string, player_count: number, deck_count?: 1\|2, bid_threshold?: number }` |
| Validation | roomname required (max 50 chars, sanitized), roompass min 6 chars, player_count 4-10 |
| Response | Callback: `{ error: string }` on failure |
| Description | Creates a new game room. Player becomes admin. Password is bcrypt-hashed. |
| Emits | `redirect-to-game-room` (S -> C) with gameId |

### `user-join-room`
| Direction | C -> S |
|-----------|--------|
| Payload | `{ roomname: string, roompass: string }` |
| Validation | Both fields required, password verified against stored hash |
| Response | Callback: `{ error: string }` on failure |
| Description | Joins existing room. Uses atomic MongoDB operation for capacity check. Handles reconnection for existing players with game state recovery. |
| Emits | `redirect-to-game-room` (S -> C), `room-message` (S -> R), `fetch-users-in-room` (S -> R) |

### `user-leave-room`
| Direction | C -> S |
|-----------|--------|
| Response | Callback acknowledges |
| Description | Leaves current room. If admin, deletes room and redirects all players home. Otherwise removes player from list. |
| Emits | `redirect-to-home-page` (S -> R if admin), `room-message` (S -> R), `fetch-users-in-room` (S -> R) |

### `user-toggle-ready`
| Direction | C -> S |
|-----------|--------|
| Response | Callback acknowledges |
| Description | Toggles player's ready status for game start. |
| Emits | `fetch-users-in-room` (S -> R) |

### `fetch-users-in-room`
| Direction | S -> R |
|-----------|--------|
| Payload | None |
| Description | Signal for clients to refresh player list via REST API. |

### `room-message`
| Direction | S -> R |
|-----------|--------|
| Payload | `string` (system message text) |
| Description | System message broadcast to all players in a room. |

### `redirect-to-game-room`
| Direction | S -> C |
|-----------|--------|
| Payload | `gameId` (MongoDB ObjectId string) |
| Description | Directs client to navigate to the game room page. |

### `redirect-to-home-page`
| Direction | S -> R |
|-----------|--------|
| Payload | None |
| Description | Directs all room players back to home page (room deleted). |

---

## Game Play Events - Bidding Phase

### `game-start`
| Direction | C -> S |
|-----------|--------|
| Payload | `{}` |
| Restriction | Admin only |
| Response | Callback: `{ error: string }` on failure |
| Prerequisites | All players ready, required player count reached |
| Description | Initializes game: creates deck, removes twos, deals cards, starts bidding. |
| Emits | `game-phase-change` ("bidding"), `game-cards-removed`, `game-state-update` (S -> R, personalized) |

### `game-place-bid`
| Direction | C -> S |
|-----------|--------|
| Payload | `{ amount: number }` |
| Response | Callback: `{ error: string }` on failure |
| Validation | Must be player's turn, valid bid (>= minimum, <= maximum, correct increment) |
| Description | Places a bid. If max bid or only one player left, transitions to powerhouse. |
| Emits | `game-state-update` (S -> R), `game-phase-change` (if bidding complete) |

### `game-pass-bid`
| Direction | C -> S |
|-----------|--------|
| Payload | `{}` |
| Response | Callback: `{ error: string }` on failure |
| Validation | Must be player's turn, hasn't already passed |
| Description | Pass on bidding. If all pass with no bids, triggers re-deal. |
| Emits | `game-state-update`, `room-message`, `game-cards-removed` (if re-deal), `game-phase-change` |

---

## Game Play Events - PowerHouse Phase

### `game-select-powerhouse`
| Direction | C -> S |
|-----------|--------|
| Payload | `{ suit: "S"\|"H"\|"D"\|"C" }` |
| Restriction | Leader (bid winner) only |
| Response | Callback: `{ error: string }` on failure |
| Description | Selects the trump suit (PowerHouse). |
| Emits | `room-message`, `game-state-update` |

### `game-select-partners`
| Direction | C -> S |
|-----------|--------|
| Payload | `{ cards: Array<{suit, rank}>, duplicateSpecs?: Array<{card: {suit, rank}, whichCopy: "1st"\|"2nd"}> }` |
| Restriction | Leader only |
| Response | Callback: `{ error: string }` on failure |
| Validation | Correct partner count, leader doesn't hold all copies of chosen cards |
| Description | Selects partner card(s) to identify teammates. Handles duplicate cards in 2-deck games. Transitions to playing phase. |
| Emits | `game-phase-change` ("playing"), `game-state-update` |

---

## Game Play Events - Playing Phase

### `game-play-card`
| Direction | C -> S |
|-----------|--------|
| Payload | `{ card: { suit: string, rank: string, deckIndex: 0\|1 } }` |
| Response | Callback: `{ error: string }` on failure |
| Validation | Player's turn, card in hand, suit-following rules respected |
| Description | Plays a card in current trick. Checks for partner reveals. Resolves trick when all players have played. |
| Emits | `game-partner-revealed` (if partner card played), `game-trick-result` (when trick complete), `game-phase-change` (if game ends), `game-result`, `game-state-update` |

---

## Game Play Events - Game Management

### `game-request-state`
| Direction | C -> S |
|-----------|--------|
| Payload | `{}` |
| Description | Requests current game state (used on page load/reconnect). Returns personalized state. |
| Emits | `game-state-update` (S -> C, to requesting player only) |

### `game-next-round`
| Direction | C -> S |
|-----------|--------|
| Payload | `{}` |
| Response | Callback: `{ error: string }` on failure |
| Description | Marks player ready for next round. When all ready, re-deals and starts new bidding. Cumulative scores carry over. |
| Emits | `next-round-ready-update`, `game-cards-removed`, `game-phase-change` ("bidding"), `game-state-update` |

### `game-quit`
| Direction | C -> S |
|-----------|--------|
| Payload | `{}` |
| Restriction | Admin only |
| Response | Callback: `{ error: string }` on failure |
| Description | Ends active game, resets room to lobby. Clears in-memory game state. |
| Emits | `game-quit` (S -> R), `fetch-users-in-room`, `room-message` |

---

## Server Broadcast Events

### `game-state-update`
| Direction | S -> C (per player, personalized) |
|-----------|--------|
| Payload | See below |
| Description | Full game state tailored to each player (only their hand visible). |

```json
{
    "gameId": "ObjectId",
    "phase": "bidding|powerhouse|playing|scoring|finished",
    "configKey": "4P1D|5P1D|6P2D|...",
    "seatOrder": ["playerId1", "playerId2", ...],
    "playerNames": { "playerId": "displayName" },
    "removedTwos": [{ "suit": "S", "rank": "2", "deckIndex": 0 }],
    "myHand": [{ "suit": "H", "rank": "A", "deckIndex": 0 }],
    "validPlays": [{ "suit": "H", "rank": "A", "deckIndex": 0 }],
    "bidding": {
        "currentBid": 150,
        "currentBidder": "playerId",
        "turnIndex": 2,
        "passes": ["playerId3"],
        "biddingComplete": false
    },
    "leader": "playerId",
    "powerHouseSuit": "S",
    "partnerCardCount": 1,
    "partnerCards": [{ "suit": "H", "rank": "K" }],
    "teams": { "bidTeam": ["id1"], "opposeTeam": ["id2", "id3"] },
    "revealedPartners": ["playerId"],
    "currentRound": { "ledSuit": "H", "plays": [...], "turnIndex": 1 },
    "currentTrick": 5,
    "tricks": [{ "winner": "playerId", "points": 25, "plays": [...] }],
    "roundLeader": "playerId",
    "handSizes": { "playerId": 10 },
    "scores": { "playerId": 150 },
    "scoringResult": { ... }
}
```

### `game-phase-change`
| Direction | S -> R |
|-----------|--------|
| Payload | `phase` (string: "bidding", "powerhouse", "playing", "scoring", "finished") |

### `game-cards-removed`
| Direction | S -> R |
|-----------|--------|
| Payload | `[{ suit, rank, deckIndex }]` |
| Description | Lists 2s removed from deck for this game variant. |

### `game-partner-revealed`
| Direction | S -> R |
|-----------|--------|
| Payload | `{ playerId: string, card: { suit, rank } }` |

### `game-trick-result`
| Direction | S -> R |
|-----------|--------|
| Payload | `{ winner: string, points: number, cards: [{ playerId, card }] }` |

### `game-result`
| Direction | S -> R |
|-----------|--------|
| Payload | `{ bidTeamPoints, opposeTeamPoints, bidAmount, bidTeamSuccess, playerDeltas: { playerId: number } }` |

### `game-player-disconnected`
| Direction | S -> R |
|-----------|--------|
| Payload | `{ playerId: string }` |

### `game-player-reconnected`
| Direction | S -> R |
|-----------|--------|
| Payload | `{ playerId: string }` |

### `next-round-ready-update`
| Direction | S -> R |
|-----------|--------|
| Payload | `{ readyPlayers: [string], totalPlayers: number }` |
