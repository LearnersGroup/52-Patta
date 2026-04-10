const User = require("../../../models/User");
const { getGameState, rehydrateGame, markActivity } = require("../../../game_engine/stateManager");

/**
 * Find the active game state for a socket's user.
 * First checks in-memory, then tries to rehydrate from MongoDB.
 * Returns { gameState, error }.
 *
 * Every successful lookup bumps gameState.lastActivityAt, which feeds the
 * stale-game sweeper. This is the chokepoint used by every gameplay
 * handler, so we get activity tracking for free without touching each
 * handler individually.
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
        markActivity(gameId);
        return { gameState };
    }

    // Try rehydrating from MongoDB
    gameState = await rehydrateGame(gameId);
    if (gameState) {
        markActivity(gameId);
        return { gameState };
    }

    return { error: "No active game found" };
}

module.exports = { findGameForSocket };
