const User = require("../../../models/User");
const { getGameState, rehydrateGame } = require("../../../game_engine/stateManager");

/**
 * Find the active game state for a socket's user.
 * First checks in-memory, then tries to rehydrate from MongoDB.
 * Returns { gameState, error }.
 */
async function findGameForSocket(socket) {
    if (!socket.user?.id) {
        return { error: "Not authenticated" };
    }

    const user = await User.findOne({ _id: socket.user.id });
    if (!user || !user.gameroom) {
        return { error: "Not in a game room" };
    }

    const gameId = user.gameroom.toString();

    // Try in-memory first
    let gameState = getGameState(gameId);
    if (gameState) {
        return { gameState };
    }

    // Try rehydrating from MongoDB
    gameState = await rehydrateGame(gameId);
    if (gameState) {
        return { gameState };
    }

    return { error: "No active game found" };
}

module.exports = { findGameForSocket };
