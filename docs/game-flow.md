# Game State Flow

> The lifecycle of a game from lobby to scoring, including state transitions and reconnection.

---

## Phase State Machine

```
                    +----------+
                    |  LOBBY   |<-----------+
                    +----+-----+            |
                         |                  |
                    [game-start]       [game-quit]
                    (admin, all ready)  (admin only)
                         |                  |
                    +----v-----+            |
            +------>| BIDDING  |            |
            |       +----+-----+            |
            |            |                  |
      [all pass,    [bid winner              |
       no bids]     determined]              |
      (re-deal)          |                  |
            |       +----v-------+          |
            |       | POWERHOUSE |          |
            |       +----+-------+          |
            |            |                  |
            |       [suit + partners        |
            |        selected]              |
            |            |                  |
            |       +----v-----+            |
            |       | PLAYING  +------------+
            |       +----+-----+
            |            |
            |       [all tricks
            |        played]
            |            |
            |       +----v-----+
            |       | SCORING  |
            |       +----+-----+
            |            |
            |       [all players
            |        ready]
            |            |
            +------------+
                (next round)
```

---

## Phase Details

### 1. LOBBY

**Entry:** Room created or game quit
**State:** `game.state = "lobby"`

**Actions available:**
- Players join/leave room
- Players toggle ready status
- Admin starts game

**Transition to BIDDING:**
- Admin emits `game-start`
- All players must be ready
- Required player count must be met

**What happens on start:**
1. Determine game config from player count and deck settings
2. Create and shuffle deck(s)
3. Remove appropriate number of twos
4. Deal cards evenly to all players
5. Initialize bidding state (first player = first in seat order)
6. Store game state in stateManager
7. Broadcast `game-cards-removed` and `game-state-update` to all players
8. Broadcast `game-phase-change` ("bidding")

---

### 2. BIDDING

**Entry:** Game start or re-deal after all-pass
**State:** `game.state = "bidding"`

**Actions available:**
- Current player: place bid or pass

**Bidding rules:**
- Minimum bid: defined by config (varies by variant)
- Maximum bid: defined by config
- Increment: defined by config
- Each bid must be higher than current
- Once passed, player cannot bid again

**Transition to POWERHOUSE:**
- One player remains (all others passed) **OR**
- Maximum bid is reached
- Winner becomes the **leader**

**Transition to RE-DEAL (back to BIDDING):**
- All players pass with no bids placed
- New deck is shuffled and dealt
- Bidding restarts from scratch

---

### 3. POWERHOUSE

**Entry:** Bidding winner determined
**State:** `game.state = "powerhouse"`

**Actions available (leader only):**
1. Select trump suit (`game-select-powerhouse`)
2. Select partner card(s) (`game-select-partners`)

**Partner card rules:**
- Number of partners depends on variant config
- Leader cannot choose a card they hold all copies of
- In 2-deck games: if leader holds one copy, they must specify which copy (1st or 2nd)
- Partners are secret until partner cards are played

**Transition to PLAYING:**
- Both suit and partner cards selected
- Teams are determined (but hidden until partners are revealed)

---

### 4. PLAYING

**Entry:** Partners selected
**State:** `game.state = "playing"`

**Actions available:**
- Current player: play a card (`game-play-card`)

**Trick rules:**
- Round leader plays first (any card)
- Other players must follow led suit if they have it
- If no led suit cards, any card is valid
- Trick ends when all players have played

**Trick resolution:**
1. PowerHouse (trump) cards beat non-trump cards
2. Among same suit: highest rank wins
3. Duplicate rule (2-deck): later card of same rank wins
4. Winner leads next trick

**Partner reveal:**
- When a partner card is played, the player is revealed as a partner
- `game-partner-revealed` is broadcast to all players
- Teams become progressively visible throughout play

**Transition to SCORING:**
- All tricks completed (cardsPerPlayer rounds)

---

### 5. SCORING

**Entry:** All tricks played
**State:** `game.state = "scoring"` then `"finished"`

**Scoring calculation:**

| Card | Points |
|------|--------|
| 3 of Spades (KaliTiri) | 30 |
| J, Q, K, A, 10 | 10 each |
| 5 | 5 each |
| All others | 0 |

**Team results:**
- **Bid team succeeds** (points >= bid): Each member earns team's total points
- **Bid team fails**: Leader loses bid amount; other members get half of opposing team's points
- **Opposing team**: Each member always gets their team's total points

**Transition to NEXT ROUND:**
- Players emit `game-next-round` to signal readiness
- `next-round-ready-update` is broadcast with progress
- When ALL players are ready, new round begins with fresh deal
- Cumulative scores carry over

**Transition to LOBBY:**
- Admin emits `game-quit`
- All game state is cleared
- All players are reset to not-ready

---

## Reconnection Flow

```
Player disconnects
       |
       v
[Game in lobby?]---YES---> Remove player from room
       |                   Notify room
       |
      NO (game active)
       |
       v
Persist game state checkpoint to MongoDB
Broadcast game-player-disconnected
Player's spot is preserved
       |
       v
Player reconnects (user-join-room)
       |
       v
Rehydrate game state from MongoDB
Restore player to room
Send game-state-update (personalized)
Broadcast game-player-reconnected
```

**Key points:**
- Active game states are kept in-memory for low latency
- Checkpoints are written to MongoDB at every phase transition and on disconnect
- On reconnect, state is rehydrated from MongoDB if not in memory
- Player's hand, turn, and all game context is fully restored

---

## Complete Game Lifecycle Example

```
1. Alice creates room "Fun Game" (4 players, 1 deck)
2. Bob, Carol, Dave join and toggle ready
3. Alice clicks Start
4. Server deals 13 cards each, removes 0 twos
5. Bob opens bidding: bids 150
6. Carol passes, Dave bids 160, Alice passes
7. Bob passes -> Dave wins bid at 160 (becomes leader)
8. Dave selects Spades as PowerHouse (trump)
9. Dave selects King of Hearts as partner card
10. Playing begins: Dave leads first trick
11. ... 13 tricks are played ...
12. During trick 5: Carol plays King of Hearts -> revealed as Dave's partner
13. Teams: Dave+Carol vs Alice+Bob
14. Final: Dave's team has 180 points (>= 160 bid) -> SUCCESS
15. Dave & Carol each get +180, Alice & Bob each get +120
16. All click "Next Round" -> new deal, scores carry forward
```
