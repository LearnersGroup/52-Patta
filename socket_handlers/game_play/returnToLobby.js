const Game = require("../../models/Game");
const { getGameState } = require("../../game_engine/stateManager");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const wrapHandler = require("../wrapHandler");

/**
 * Reset the DB to lobby state when a player clicks "Return to Lobby" early
 * (before the auto-timer fires).  Only resets the DB and refreshes lobby data —
 * it does NOT kick other players out of the series-finished screen.  Each player
 * returns individually; the auto-timer will send anyone still waiting after its
 * timeout via game-series-complete.
 */
module.exports = wrapHandler("game-return-to-lobby", async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        // Already cleaned up (e.g. another player triggered this first) — still fine
        if (callback) callback(null);
        return;
    }

    // Only reset if we're still in series-finished phase
    if (gameState.phase !== "series-finished") {
        if (callback) callback(null);
        return;
    }

    // Move DB to lobby (ready flags were already reset when series-finished was set)
    await Game.findByIdAndUpdate(gameState.gameId, { $set: { state: "lobby" } });

    // Refresh lobby data for any clients already in lobby view
    io.to(gameState.roomname).emit("fetch-users-in-room");

    // NOTE: We deliberately do NOT emit game-series-complete here (that would
    // send everyone back), and we do NOT delete the in-memory game state (the
    // auto-timer still needs it to send remaining players home).

    if (callback) callback(null);
});
