/**
 * Game Strategy Registry.
 *
 * Central lookup for game-type-specific behaviour.  Each game type registers
 * a "strategy" object that socket handlers and helpers call instead of
 * hard-coding `if (isJudgement) …` branches.
 *
 * Usage:
 *   const { getStrategy } = require('./gameRegistry');
 *   const strategy = getStrategy(gameState.game_type);
 *   strategy.deal(processedDeck, seatOrder, ...);
 *
 * See `strategies/GameStrategy.js` for the full interface contract every
 * strategy must implement.
 */

const { REQUIRED_METHODS } = require('./strategies/GameStrategy');

const strategies = {};

/**
 * Register a game strategy.  Throws if any required methods are missing,
 * catching incomplete implementations at startup rather than at runtime.
 *
 * @param {string} type     - Game type key (e.g. "kaliteri", "judgement")
 * @param {object} strategy - Strategy object implementing the GameStrategy contract
 */
function registerStrategy(type, strategy) {
    const missing = REQUIRED_METHODS.filter(
        (method) => typeof strategy[method] !== 'function'
    );

    if (missing.length > 0) {
        throw new Error(
            `Strategy "${type}" is missing required method(s): ${missing.join(', ')}. ` +
            `See game_engine/strategies/GameStrategy.js for the full contract.`
        );
    }

    strategies[type] = strategy;
}

function getStrategy(type) {
    const s = strategies[type || "kaliteri"];
    if (!s) throw new Error(`Unknown game type: ${type}`);
    return s;
}

function getAllTypes() {
    return Object.keys(strategies);
}

module.exports = { registerStrategy, getStrategy, getAllTypes };
