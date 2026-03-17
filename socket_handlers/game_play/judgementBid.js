const { placeJudgementBid } = require("../../game_engine/judgement/bidding");
const { initTrick } = require("../../game_engine/tricks");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler("game-judgement-bid", async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        if (callback) callback(error);
        return;
    }

    if (gameState.game_type !== "judgement") {
        if (callback) callback("This room is not playing Judgement");
        return;
    }

    if (gameState.phase !== "bidding") {
        if (callback) callback("Game is not in bidding phase");
        return;
    }

    const amount = Number(data?.amount);
    if (!Number.isInteger(amount)) {
        if (callback) callback("Bid must be an integer");
        return;
    }

    const result = placeJudgementBid(
        gameState.bidding,
        socket.user.id,
        amount,
        gameState.currentCardsPerRound
    );

    if (result.error) {
        if (callback) callback(result.error);
        return;
    }

    const newState = {
        ...gameState,
        bidding: result.state,
    };

    if (result.state.biddingComplete) {
        const firstLeader = gameState.seatOrder[(gameState.dealerIndex + 1) % gameState.seatOrder.length];
        newState.phase = "playing";
        newState.leader = firstLeader;
        newState.currentRound = 0;
        newState.roundLeader = firstLeader;
        newState.currentTrick = initTrick(firstLeader, gameState.seatOrder);
    }

    setGameState(gameState.gameId, newState);
    await persistCheckpoint(gameState.gameId);

    if (result.state.biddingComplete) {
        io.to(gameState.roomname).emit("game-phase-change", "playing");
    }

    await broadcastGameState(io, newState);
});
