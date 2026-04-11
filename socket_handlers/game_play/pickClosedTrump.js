const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { broadcastGameState } = require("./helpers/broadcastState");
const { pickClosedTrump } = require("../../game_engine/mendikot/bandHukum");
const { initTrick, updatePendingRevealDecision } = require("../../game_engine/mendikot/tricks");
const Game = require("../../models/Game");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler("pick-closed-trump", async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        if (callback) callback(error);
        return;
    }

    if (gameState.game_type !== "mendikot") {
        if (callback) callback("This room is not playing Mendikot");
        return;
    }

    if (gameState.phase !== "band-hukum-pick") {
        if (callback) callback("Game is not in band-hukum-pick phase");
        return;
    }

    const pickerId = gameState.closed_trump_holder_id;
    if (pickerId !== socket.user.id) {
        if (callback) callback("Only the closed-trump picker can select the card");
        return;
    }

    const hand = gameState.hands?.[pickerId] || [];
    let chosenCard = null;
    if (data?.position !== undefined && data.position !== null) {
        const pos = Number.parseInt(data.position, 10);
        if (!Number.isInteger(pos) || pos < 0 || pos >= hand.length) {
            if (callback) callback("Invalid pick position");
            return;
        }
        chosenCard = hand[pos];
    }
    const result = pickClosedTrump(gameState, pickerId, chosenCard);
    if (result.error) {
        if (callback) callback(result.error);
        return;
    }

    const holderIndex = gameState.seatOrder.indexOf(gameState.closed_trump_holder_id);
    const firstLeader = gameState.seatOrder[(holderIndex + 1) % gameState.seatOrder.length];

    gameState.phase = "playing";
    gameState.leader = firstLeader;
    gameState.roundLeader = firstLeader;
    gameState.currentRound = 0;
    gameState.currentTrick = initTrick(firstLeader, gameState.seatOrder);
    updatePendingRevealDecision(gameState);

    setGameState(gameState.gameId, gameState);
    await Game.findByIdAndUpdate(gameState.gameId, { state: "playing" });
    await persistCheckpoint(gameState.gameId);

    io.to(gameState.roomname).emit("game-phase-change", "playing");
    await broadcastGameState(io, gameState);
});
