const Game = require("../models/Game");

/**
 * In-memory store for active game states.
 * Key: gameId (string), Value: gameState object
 */
const activeGames = new Map();

function getGameState(gameId) {
    return activeGames.get(gameId) || null;
}

function setGameState(gameId, state) {
    if (state && !state.lastActivityAt) {
        state.lastActivityAt = Date.now();
    }
    activeGames.set(gameId, state);
}

function deleteGameState(gameId) {
    activeGames.delete(gameId);
}

function hasActiveGame(gameId) {
    return activeGames.has(gameId);
}

/**
 * Bump the lastActivityAt timestamp for a game. Called on every player action
 * (bid, play card, shuffle, etc.) so the stale-eviction job can reliably tell
 * which games are idle.
 */
function markActivity(gameId) {
    const state = activeGames.get(gameId);
    if (state) {
        state.lastActivityAt = Date.now();
    }
}

/**
 * Iterate all active games. Yields [gameId, state] tuples.
 */
function listActiveGames() {
    return Array.from(activeGames.entries());
}

/**
 * Persist current game state to MongoDB as a checkpoint.
 * Called at phase transitions and on player disconnect.
 */
async function persistCheckpoint(gameId) {
    const state = activeGames.get(gameId);
    if (!state) return;

    try {
        // Strip the analytics recording blob before checkpointing — it is
        // not needed for game rehydration and can be 50-100 KB by end-of-game.
        // The final GameRecord document captures it separately.
        const { recording: _recording, ...checkpointState } = state;
        await Game.findByIdAndUpdate(gameId, {
            gameState: checkpointState,
            state: state.phase,
        });
    } catch (error) {
        console.error("Failed to persist game checkpoint:", error.message);
    }
}

/**
 * Rehydrate a game state from MongoDB into memory.
 * Used on server restart or player reconnection.
 */
async function rehydrateGame(gameId) {
    if (activeGames.has(gameId)) {
        return activeGames.get(gameId);
    }

    try {
        const game = await Game.findById(gameId);
        if (game && game.gameState) {
            activeGames.set(gameId, game.gameState);
            return game.gameState;
        }
    } catch (error) {
        console.error("Failed to rehydrate game:", error.message);
    }

    return null;
}

/**
 * Get count of active games (for monitoring).
 */
function getActiveGameCount() {
    return activeGames.size;
}

module.exports = {
    getGameState,
    setGameState,
    deleteGameState,
    hasActiveGame,
    markActivity,
    listActiveGames,
    persistCheckpoint,
    rehydrateGame,
    getActiveGameCount,
};
