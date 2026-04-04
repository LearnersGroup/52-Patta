/**
 * GameStrategy — base class / contract for all game type strategies.
 *
 * Every game type (Kaliteri, Judgement, future games) must register a strategy
 * object that implements every method defined here. Calling a method that has
 * not been overridden throws a descriptive error at runtime, catching missing
 * implementations early.
 *
 * Usage — add a new game type:
 *   1. Create `game_engine/strategies/myGame.js`
 *   2. Implement all methods below (override the ones you need, they all throw by default)
 *   3. Call `registerStrategy('myGame', new MyGameStrategy())` at the bottom of that file
 *
 * The registry validates that all required methods are present on registration
 * (see gameRegistry.js).
 */

class GameStrategy {
    /**
     * The game type identifier string.  Must match the key passed to
     * `registerStrategy()` and the `game_type` field stored on game state.
     * @type {string}
     */
    get type() {
        throw new Error(`${this.constructor.name} must define a 'type' getter`);
    }

    // ── Configuration ────────────────────────────────────────────────────

    /**
     * Build the full runtime config object for a game room.
     *
     * @param {object} game        - The Game mongoose document (room settings)
     * @param {number} playerCount - Number of players in the room
     * @param {number} deckCount   - Number of decks to use
     * @returns {object} config    - Game-specific config object passed into buildInitialState
     */
    computeConfig(game, playerCount, deckCount) {
        throw new Error(`${this.constructor.name}.computeConfig() is not implemented`);
    }

    /**
     * Return the default deck count for a given player count.
     *
     * @param {number} playerCount
     * @returns {number} 1 or 2
     */
    autoDeckCount(playerCount) {
        throw new Error(`${this.constructor.name}.autoDeckCount() is not implemented`);
    }

    // ── Game state construction ──────────────────────────────────────────

    /**
     * Build the initial in-memory game state object when a game starts.
     *
     * @param {object} params
     * @param {string}   params.gameId        - MongoDB Game document _id (string)
     * @param {object}   params.game          - The Game mongoose document
     * @param {object}   params.config        - Result of computeConfig()
     * @param {string[]} params.seatOrder     - Ordered array of player socket IDs
     * @param {object}   params.playerNames   - Map of socketId → display name
     * @param {object}   params.playerAvatars - Map of socketId → avatar URL/data-URI
     * @param {object}   params.scores        - Map of socketId → cumulative score
     * @returns {object} gameState            - Full initial game state
     */
    buildInitialState({ gameId, game, config, seatOrder, playerNames, playerAvatars, scores }) {
        throw new Error(`${this.constructor.name}.buildInitialState() is not implemented`);
    }

    /**
     * Return the initial `state` string to persist on the Game DB document
     * after startGame (e.g. "shuffling", "trump-announce").
     *
     * @returns {string}
     */
    initialDbState() {
        throw new Error(`${this.constructor.name}.initialDbState() is not implemented`);
    }

    // ── Lifecycle hooks ──────────────────────────────────────────────────

    /**
     * Called immediately after the game starts. Use this to emit the initial
     * phase-change event and any game-specific setup events (e.g. removed cards).
     *
     * @param {object} io        - Socket.IO server instance
     * @param {object} gameState - Current game state
     * @param {object} deps      - Game-type-specific dependencies (timers, helpers, etc.)
     */
    afterStart(io, gameState, deps) {
        throw new Error(`${this.constructor.name}.afterStart() is not implemented`);
    }

    // ── Dealing ──────────────────────────────────────────────────────────

    /**
     * Deal cards to all players from the shuffled deck.
     *
     * @param {object[]} processedDeck - Shuffled deck array
     * @param {object}   gameState     - Current game state
     * @returns {{ hands: object, bidding: object, trumpCard: object|null, trumpSuit: string|null }}
     */
    deal(processedDeck, gameState) {
        throw new Error(`${this.constructor.name}.deal() is not implemented`);
    }

    /**
     * Apply any extra state mutations after deal results are merged in.
     * Called immediately after the deal() result is spread into gameState.
     * Can be a no-op.
     *
     * @param {object} gameState - Mutable game state (mutate in-place)
     */
    applyDealExtras(gameState) {
        throw new Error(`${this.constructor.name}.applyDealExtras() is not implemented`);
    }

    /**
     * Transition from the dealing phase to the bidding phase.
     * Mutates gameState.phase and sets any bidding timer fields.
     *
     * @param {object} gameState - Mutable game state
     * @returns {{ type: string, timerDelayMs?: number, cardRevealMs?: number }}
     *   Descriptor used by dealCardsHandler to schedule the bid expiry timer.
     */
    transitionToBidding(gameState) {
        throw new Error(`${this.constructor.name}.transitionToBidding() is not implemented`);
    }

    // ── Round end / scoring ──────────────────────────────────────────────

    /**
     * Called when the last trick of a round is complete.
     * Computes scores, updates phase, and returns the final state for this round.
     * Pure function — must NOT mutate gameState directly; return a new state object.
     *
     * @param {object} io        - Socket.IO server instance
     * @param {object} gameState - State before the round ended
     * @param {object} newState  - State after the last trick (tricks/hands already updated)
     * @returns {object} finalState - New game state with scores and updated phase
     *   Expected to include at minimum: `scores`, `scoringResult`, `phase`
     */
    onRoundEnd(io, gameState, newState) {
        throw new Error(`${this.constructor.name}.onRoundEnd() is not implemented`);
    }

    /**
     * Emit round-end events and schedule the next round/game transition.
     * Called immediately after onRoundEnd() results are persisted.
     *
     * @param {object} io         - Socket.IO server instance
     * @param {object} gameState  - State before the round ended
     * @param {object} finalState - State returned by onRoundEnd()
     * @param {object} deps       - Game-type-specific dependencies (timers, helpers, etc.)
     */
    afterRoundEnd(io, gameState, finalState, deps) {
        throw new Error(`${this.constructor.name}.afterRoundEnd() is not implemented`);
    }

    // ── Next round ───────────────────────────────────────────────────────

    /**
     * Advance to the next round/game within a series.
     * Called when all players signal they are ready, or by an auto-advance timer.
     *
     * @param {object} io            - Socket.IO server instance
     * @param {string} gameId        - Game document ID
     * @param {object} existingState - Current game state
     * @param {object} deps          - { Game, setGameState, persistCheckpoint, broadcastGameState, ... }
     * @returns {Promise<void>}
     */
    async nextRound(io, gameId, existingState, deps) {
        throw new Error(`${this.constructor.name}.nextRound() is not implemented`);
    }

    // ── Public view ──────────────────────────────────────────────────────

    /**
     * Build the sanitised game state object that is broadcast to all clients.
     * Must NOT include private fields (other players' hands, etc.).
     *
     * @param {object}   gameState - Full server-side game state
     * @param {object}   handSizes - Map of socketId → number of cards in hand
     * @returns {object} publicView - The object emitted via `game-state` socket event
     */
    buildPublicView(gameState, handSizes) {
        throw new Error(`${this.constructor.name}.buildPublicView() is not implemented`);
    }
}

/**
 * The ordered list of method names every strategy must implement.
 * Used by gameRegistry.js to validate strategies on registration.
 */
const REQUIRED_METHODS = [
    'computeConfig',
    'autoDeckCount',
    'buildInitialState',
    'initialDbState',
    'afterStart',
    'deal',
    'applyDealExtras',
    'transitionToBidding',
    'onRoundEnd',
    'afterRoundEnd',
    'nextRound',
    'buildPublicView',
];

module.exports = { GameStrategy, REQUIRED_METHODS };
