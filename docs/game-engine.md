# Game Engine Module Diagram

> Architecture and API reference for the game engine modules.

---

## Module Dependency Graph

```
                    +-------------------+
                    |   index.js        |
                    | (central export)  |
                    +--------+----------+
                             |
          +--------+---------+--------+---------+
          |        |         |        |         |
    +-----v--+ +---v----+ +-v------+ +-v------+ +--v---------+
    | config | | deck   | |bidding | |tricks  | | scoring    |
    +-----+--+ +---+----+ +---+----+ +---+----+ +-----+------+
          |        |           |          |            |
          |   +----v-----------v----------v---+        |
          +-->|        validators              |<------+
              +-------------------------------+
                             |
              +--------------v--------------+
              |       powerhouse            |
              +-----------------------------+
                             |
              +--------------v--------------+
              |       stateManager          |
              |   (in-memory + MongoDB)     |
              +-----------------------------+
```

---

## config.js

Defines game variants and card properties.

### Supported Variants

| Config Key | Players | Decks | Cards Dealt | Rounds | Twos Removed | Partners |
|------------|---------|-------|-------------|--------|--------------|----------|
| `4P1D` | 4 | 1 | 13 each | 13 | 0 | 1 |
| `5P1D` | 5 | 1 | 10 each | 10 | 2 | 1-2* |
| `6P1D` | 6 | 1 | 8 each | 8 | 4 | 2 |
| `6P2D` | 6 | 2 | 17 each | 17 | 0 | 2 |
| `7P2D` | 7 | 2 | 14 each | 14 | 6 | 2-3* |
| `8P2D` | 8 | 2 | 12 each | 12 | 8 | 3 |
| `9P2D` | 9 | 2 | 11 each | 11 | 3 | 3-4* |
| `10P2D` | 10 | 2 | 10 each | 10 | 4 | 4 |

\* Odd-player configs support optional `bid_threshold` for team advantage (higher bid = extra partner).

### Exports

```js
getConfig(playerCount, deckCount)
// Returns: { key, players, decks, totalCards, cardsPerPlayer,
//            rounds, twosToRemove, partnerCount, bidMin, bidMax,
//            bidIncrement, bidThreshold? }

getCardPoints(card)
// Returns: 10 (J/Q/K/A/10), 5 (5s), 30 (3 of Spades), 0 (others)

compareRanks(rankA, rankB)
// Returns: -1, 0, 1 based on rank order

SUITS       // ["S", "H", "D", "C"]
RANKS       // ["2", "3", ..., "K", "A"]
RANK_ORDER  // { "2": 0, "3": 1, ..., "K": 11, "A": 12 }
```

---

## deck.js

Card deck creation, shuffling, and dealing.

### Card Structure
```js
{ suit: "S"|"H"|"D"|"C", rank: "2"-"A", deckIndex: 0|1 }
```

### Exports

```js
createDeck(deckCount)
// Returns: Array of 52 or 104 card objects

shuffleDeck(cards)
// Fisher-Yates shuffle using crypto.getRandomValues()
// Returns: shuffled array (mutates in-place)

removeTwos(deck, removeCount)
// Randomly removes N twos from deck
// Returns: { deck: Card[], removed: Card[] }

dealCards(deck, seatOrder)
// Deals cards one-at-a-time clockwise to each player
// Returns: { playerId: Card[] } hands map

cardsEqual(a, b)   // Exact match: suit, rank, AND deckIndex
cardsDuplicate(a, b) // Same suit/rank but DIFFERENT deckIndex (2-deck only)
cardsMatch(a, b)    // Same suit/rank (ignores deckIndex)
```

---

## bidding.js

Manages the bidding phase.

### Bidding State
```js
{
    currentBid: number,       // Current highest bid (0 = no bids)
    currentBidder: string,    // PlayerId of current highest bidder
    turnIndex: number,        // Index in seatOrder for current turn
    passes: string[],         // PlayerIds who have passed
    startingBid: number,      // Minimum valid bid
    biddingComplete: boolean  // True when winner determined
}
```

### Exports

```js
initBidding(config, seatOrder)
// Returns: fresh bidding state, first player's turn

placeBid(biddingState, seatOrder, config, playerId, amount)
// Validates: player's turn, amount >= minimum, amount <= maximum
// Returns: updated biddingState
// Throws: if validation fails

passBid(biddingState, seatOrder, config, playerId)
// Returns: updated biddingState OR { redeal: true } if all pass with 0 bids
// Throws: if validation fails

getBidWinner(biddingState)
// Returns: playerId of winning bidder

getNextBidderIndex(seatOrder, currentIndex, passes)
// Skips passed players, returns next active player's index
```

---

## powerhouse.js

Trump selection and partner card management.

### Partner Card Spec
```js
{
    card: { suit, rank },
    whichCopy: null | "1st" | "2nd",  // For 2-deck duplicate disambiguation
    playCount: 0,                      // Times this card has been played
    revealed: false,                   // Whether partner is known
    partnerId: null | string           // PlayerId of partner (set on reveal)
}
```

### Exports

```js
selectPowerHouse(gameState, playerId, suit)
// Sets powerHouseSuit on game state
// Restriction: leader only, valid suit

selectPartnerCards(gameState, playerId, cards, duplicateSpecs)
// Sets partnerCards on game state
// Validates: count matches config, leader doesn't hold all copies
// Handles: duplicate disambiguation for 2-deck games

getPartnerCardCount(gameState)
// Returns: number of partner cards needed

determineTeams(gameState)
// Returns: { bidTeamSize, opposeTeamSize } based on bid threshold

checkPartnerReveal(gameState, playerId, card)
// Checks if played card is a partner card
// Returns: { revealed: boolean, partnerId?, card? }
```

---

## tricks.js

Manages trick play and resolution.

### Trick State
```js
{
    ledSuit: string | null,    // Suit of the first card played
    plays: [{
        playerId: string,
        card: { suit, rank, deckIndex },
        order: number          // Play order within trick
    }],
    turnIndex: number          // Current player index in seatOrder
}
```

### Exports

```js
initTrick(roundLeader, seatOrder)
// Returns: fresh trick state with leader as first player

playCard(gameState, playerId, card)
// Validates: turn, card in hand, suit-following rules
// Removes card from hand, adds to trick plays
// Returns: updated game state

completeTrick(gameState)
// Resolves trick winner, accumulates points
// Starts next trick or transitions to scoring
// Returns: { winner, points, gameOver }

resolveTrick(trick, powerHouseSuit)
// Winner priority: PowerHouse suit > Led suit
// Duplicate rule: later card of same rank wins
// Returns: winning playerId

getValidPlays(gameState, playerId)
// First card: any card valid
// Has led suit cards: must follow suit
// No led suit: any card valid
// Returns: Card[]

calculateTrickPoints(plays)
// Sums point values of all played cards
// Returns: number
```

### Suit-Following Rules
1. **First to play:** Any card is valid
2. **Has led suit:** Must play a card of the led suit
3. **No led suit:** Can play any card (including PowerHouse/trump)

### Trick Resolution
1. Separate plays into PowerHouse suit cards and led suit cards
2. If any PowerHouse cards were played, winner is highest PowerHouse card
3. Otherwise, winner is highest card of the led suit
4. **Duplicate rule:** When two cards of the same rank exist, the later one wins

---

## scoring.js

Calculates game results.

### Scoring Result
```js
{
    bidTeamPoints: number,     // Total points won by bid team
    opposeTeamPoints: number,  // Total points won by opposing team
    bidAmount: number,         // The winning bid
    bidTeamSuccess: boolean,   // Did bid team meet their bid?
    playerDeltas: {            // Score changes per player
        playerId: number
    }
}
```

### Scoring Rules

| Scenario | Bid Team Members | Opposing Team Members |
|----------|-----------------|----------------------|
| **Bid succeeds** | Each gets bidTeamPoints | Each gets opposeTeamPoints |
| **Bid fails** | Leader: loses bidAmount | Each gets opposeTeamPoints |
| | Other members: gets opposeTeamPoints / 2 | |

### Exports

```js
sumPointsForTeam(tricks, teamPlayerIds)
// Returns: total points won by team across all tricks

calculateGameResult(gameState)
// Returns: scoring result object

applyScoring(currentScores, result)
// Adds deltas to cumulative scores
// Returns: updated scores map
```

---

## validators.js

Game rule validation utilities.

### Exports

```js
isPlayersTurn(gameState, playerId)
// Returns: boolean

canFollowSuit(hand, ledSuit)
// Returns: boolean - does player have any cards of ledSuit?

findCardInHand(hands, playerId, card)
// Returns: index in hand (-1 if not found)

validateCardInHand(hands, playerId, card)
// Returns: boolean

validateCardPlay(hand, card, ledSuit, powerHouseSuit)
// Enforces suit-following rules
// Returns: boolean
```

---

## stateManager.js

In-memory game state storage with MongoDB persistence.

### Exports

```js
getGameState(gameId)       // Returns in-memory state or null
setGameState(gameId, state) // Stores/updates in-memory
deleteGameState(gameId)     // Removes from memory (on quit)
hasActiveGame(gameId)       // Boolean check

persistCheckpoint(gameId)
// Saves current state to MongoDB Game.gameState field
// Called at: phase transitions, disconnects

rehydrateGame(gameId)
// Loads state from MongoDB back to memory
// Used on: reconnect, server restart

getActiveGameCount()        // Number of in-memory games
```
