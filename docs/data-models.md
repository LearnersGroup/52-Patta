# Data Model Documentation

> Database schemas, in-memory state structures, and their relationships.

---

## MongoDB Models

### User

**Collection:** `users`
**File:** `models/User.js`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | Yes | - | Display name |
| `email` | String | Yes (unique) | - | Login email |
| `password` | String | Yes | - | Bcrypt-hashed password |
| `avatar` | String | No | - | Gravatar URL |
| `date` | Date | No | `Date.now` | Account creation |
| `gameroom` | ObjectId (ref: "game") | No | `null` | Current game room |

**Indexes:** `_id` (implicit), `email` (unique)

**Relationships:**
- `gameroom` -> `Game._id` (nullable, 1-to-1)
- Referenced by `Game.admin` and `Game.players[].playerId`

---

### Game

**Collection:** `games`
**File:** `models/Game.js`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `admin` | ObjectId (ref: "user") | No | - | Room creator |
| `roomname` | String | Yes (unique) | - | Room display name (max 50 chars) |
| `roompass` | String | Yes | - | Bcrypt-hashed room password |
| `player_count` | Number | Yes | - | Target player count (4-10) |
| `deck_count` | Number | No | `null` | 1 or 2 (for 6-player choice) |
| `bid_threshold` | Number | No | `null` | Bid amount for team advantage |
| `players` | Array | No | `[]` | Player list (see sub-schema) |
| `messages` | [String] | No | `[]` | Room chat messages |
| `state` | String | No | `"lobby"` | Game phase |
| `gameState` | Mixed | No | `null` | Full game state (persistence) |

**Players Sub-Schema:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `playerId` | ObjectId (ref: "user") | - | Player reference |
| `ready` | Boolean | `false` | Ready for game start |

**Indexes:** `_id` (implicit), `roomname` (unique)

**State Values:** `"lobby"`, `"bidding"`, `"powerhouse"`, `"playing"`, `"scoring"`, `"finished"`

---

## In-Memory Game State

Stored in `stateManager.js` as a JavaScript `Map<gameId, GameState>`.
Persisted to `Game.gameState` field in MongoDB at checkpoints.

```js
{
    // Identity
    gameId: "ObjectId string",
    configKey: "4P1D",               // Game variant identifier
    config: { ... },                 // Full config object

    // Players
    seatOrder: ["playerId1", ...],   // Turn order (clockwise)
    playerNames: {                   // Display names
        "playerId": "Player Name"
    },

    // Deck
    removedTwos: [                   // Twos removed before dealing
        { suit: "S", rank: "2", deckIndex: 0 }
    ],
    hands: {                         // Player hands (PRIVATE)
        "playerId": [
            { suit: "H", rank: "A", deckIndex: 0 }
        ]
    },

    // Bidding
    bidding: {
        currentBid: 160,
        currentBidder: "playerId",
        turnIndex: 2,
        passes: ["playerId1", "playerId3"],
        startingBid: 100,
        biddingComplete: true
    },

    // PowerHouse
    leader: "playerId",              // Bid winner
    powerHouseSuit: "S",             // Trump suit
    partnerCards: [                   // Partner card specs
        {
            card: { suit: "H", rank: "K" },
            whichCopy: null,         // "1st"|"2nd" for 2-deck
            playCount: 0,
            revealed: false,
            partnerId: null
        }
    ],

    // Teams
    teams: {
        bidTeam: ["playerId1"],
        opposeTeam: ["playerId2", "playerId3", "playerId4"]
    },
    revealedPartners: [],            // PlayerIds revealed during play

    // Tricks
    phase: "playing",
    currentTrick: 5,                 // 0-indexed trick number
    currentRound: {                  // Active trick
        ledSuit: "H",
        plays: [
            { playerId: "id1", card: { suit: "H", rank: "K", deckIndex: 0 }, order: 0 }
        ],
        turnIndex: 1
    },
    tricks: [                        // Completed tricks
        { winner: "playerId", points: 25, plays: [...] }
    ],
    roundLeader: "playerId",         // Who leads current trick

    // Scoring
    scores: {                        // Cumulative across rounds
        "playerId1": 320,
        "playerId2": 180
    },
    scoringResult: null,             // Set after game ends

    // Reconnection
    disconnectedPlayers: [],          // PlayerIds currently disconnected
    nextRoundReady: []                // PlayerIds ready for next round
}
```

---

## Personalized State (sent to clients)

The `game-state-update` event sends a filtered version per player:

```js
{
    // Shared (visible to all)
    gameId, phase, configKey, seatOrder, playerNames,
    removedTwos, bidding, leader, powerHouseSuit,
    partnerCardCount, partnerCards,  // Cards shown, not who holds them
    teams,                           // Only after game ends
    revealedPartners,
    currentRound,                    // Current trick (all played cards visible)
    currentTrick, tricks, roundLeader,
    handSizes,                       // { playerId: cardCount } (not contents)
    scores, scoringResult,

    // Private (unique per player)
    myHand,                          // Only this player's cards
    validPlays                       // Cards they can legally play
}
```

**Key privacy rules:**
- `hands` object is never sent to clients
- Each player only sees `myHand` (their own cards)
- Other players' hand sizes are visible (card count, not contents)
- Partner identities are hidden until cards are played
- Full team composition is hidden until partners are revealed or game ends

---

## Entity Relationship Diagram

```
+-------------------+         +-------------------+
|      User         |         |      Game         |
+-------------------+         +-------------------+
| _id (PK)          |    +--->| _id (PK)          |
| name              |    |    | admin (FK->User)  |
| email (unique)    |    |    | roomname (unique)  |
| password          |    |    | roompass           |
| avatar            |    |    | player_count       |
| date              |    |    | deck_count         |
| gameroom (FK)  ---+----+    | bid_threshold      |
+-------------------+         | state              |
        ^                     | gameState (Mixed)  |
        |                     |                    |
        |                     | players: [         |
        +---------------------+   playerId (FK) ---|
                              |   ready            |
                              | ]                  |
                              | messages: [String] |
                              +-------------------+
```

**Relationships:**
- User.gameroom -> Game._id (1-to-1, nullable)
- Game.admin -> User._id (1-to-1)
- Game.players[].playerId -> User._id (1-to-many)
- In-memory GameState is keyed by Game._id
