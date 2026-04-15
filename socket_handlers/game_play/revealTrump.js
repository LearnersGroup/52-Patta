const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { broadcastGameState } = require("./helpers/broadcastState");
const { revealTrump } = require("../../game_engine/mendikot/bandHukum");
const { getValidPlays } = require("../../game_engine/mendikot/tricks");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler("reveal-trump", async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        if (callback) callback(error);
        return;
    }

    if (gameState.game_type !== "mendikot") {
        if (callback) callback("This room is not playing Mendikot");
        return;
    }

    if (gameState.phase !== "playing") {
        if (callback) callback("Game is not in playing phase");
        return;
    }

    const result = revealTrump(gameState, socket.user.id);
    if (result.error) {
        if (callback) callback(result.error);
        return;
    }

    setGameState(gameState.gameId, gameState);
    await persistCheckpoint(gameState.gameId);

    io.to(gameState.roomname).emit("mendikot-trump-revealed", {
        by: socket.user.id,
        suit: gameState.trump_suit,
        card: gameState.closed_trump_card || null,
        forcedPlays: getValidPlays(gameState, socket.user.id),
    });

    await broadcastGameState(io, gameState);
});
