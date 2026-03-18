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
 */

const strategies = {};

function registerStrategy(type, strategy) {
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
