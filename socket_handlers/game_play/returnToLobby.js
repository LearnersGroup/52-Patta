const Game = require("../../models/Game");
const { getGameState, deleteGameState } = require("../../game_engine/stateManager");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const wrapHandler = require("../wrapHandler");

/**
 * Immediately return the entire room to lobby from "series-finished".
 * Called when any player clicks the "Return to Lobby" button early,
 * before the auto-timer fires.
 */
module.exports = wrapHandler("game-return-to-lobby", async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        if (callback) callback(error);
        return;
    }

    // Only act if game is still in series-finished phase
    if (gameState.phase !== "series-finished") {
        if (callback) callback(null); // no-op if already resolved
        return;
    }

    // Reset to lobby and clear all ready flags
    await Game.findByIdAndUpdate(gameState.gameId, {
        $set: {
            state: "lobby",
            "players.$[].ready": false,
        },
    });

    // Remove in-memory game state
    deleteGameState(gameState.gameId);

    // Notify all clients to return to lobby and refresh their player list
    io.to(gameState.roomname).emit("game-series-complete", {
        finalRankings: gameState.finalRankings || [],
    });
    io.to(gameState.roomname).emit("fetch-users-in-room");

    if (callback) callback(null);
});
