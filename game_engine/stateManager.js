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
    activeGames.set(gameId, state);
}

function deleteGameState(gameId) {
    activeGames.delete(gameId);
}

function hasActiveGame(gameId) {
    return activeGames.has(gameId);
}

/**
 * Persist current game state to MongoDB as a checkpoint.
 * Called at phase transitions and on player disconnect.
 */
async function persistCheckpoint(gameId) {
    const state = activeGames.get(gameId);
    if (!state) return;

    try {
        await Game.findByIdAndUpdate(gameId, {
            gameState: state,
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
    persistCheckpoint,
    rehydrateGame,
    getActiveGameCount,
};
