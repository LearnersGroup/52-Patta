const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
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

    const gameId = gameState.gameId;
    const revealMs = gameState.config?.cardRevealTimeMs ?? 10000;

    gameState.phase = "card-reveal";
    setGameState(gameId, gameState);
    await Game.findByIdAndUpdate(gameId, { state: "card-reveal" });
    await persistCheckpoint(gameId);
    io.to(gameState.roomname).emit("game-phase-change", "card-reveal");
    await broadcastGameState(io, gameState);

    setTimeout(async () => {
        const currentState = getGameState(gameId);
        if (!currentState || currentState.phase !== "card-reveal") return;

        const holderIndex = currentState.seatOrder.indexOf(currentState.closed_trump_holder_id);
        const firstLeader = currentState.seatOrder[(holderIndex + 1) % currentState.seatOrder.length];

        currentState.phase = "playing";
        currentState.leader = firstLeader;
        currentState.roundLeader = firstLeader;
        currentState.currentRound = 0;
        currentState.currentTrick = initTrick(firstLeader, currentState.seatOrder);
        updatePendingRevealDecision(currentState);

        setGameState(gameId, currentState);
        await Game.findByIdAndUpdate(gameId, { state: "playing" });
        await persistCheckpoint(gameId);
        io.to(currentState.roomname).emit("game-phase-change", "playing");
        await broadcastGameState(io, currentState);
    }, revealMs);
});
