const { placeJudgementBid } = require("../../game_engine/judgement/bidding");
const { initTrick } = require("../../game_engine/tricks");
const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { scheduleJudgementBidTimeout, clearJudgementBidTimeout } = require("./helpers/judgementTimers");
const { recordJudgementBid } = require("../../game_engine/recording");
const wrapHandler = require("../wrapHandler");

/**
 * Apply a bid for a player and update game state.
 * Shared by socket handler and auto-bid timer.
 */
async function applyJudgementBid(io, gameState, playerId, amount) {
    // Compute forbidden value for the last bidder (dealer restriction) so we
    // can record the exact set of options the player had.
    const biddingState = gameState.bidding;
    const isLastBidder = biddingState &&
        biddingState.currentBidderIndex === (biddingState.bidOrder?.length ?? 0) - 1 &&
        biddingState.bidOrder?.[biddingState.currentBidderIndex] === playerId;
    let forbidden = null;
    if (isLastBidder) {
        const runningTotal = Object.values(biddingState.bids || {}).reduce((s, v) => s + v, 0);
        const f = gameState.currentCardsPerRound - runningTotal;
        if (f >= 0 && f <= gameState.currentCardsPerRound) forbidden = f;
    }

    const result = placeJudgementBid(
        gameState.bidding,
        playerId,
        amount,
        gameState.currentCardsPerRound
    );

    if (result.error) return { error: result.error };

    // Record the accepted bid with its option space.
    recordJudgementBid(gameState, playerId, amount, {
        cardsInRound: gameState.currentCardsPerRound,
        forbidden,
    });

    const gameId = gameState.gameId;
    const newState = { ...gameState, bidding: result.state };

    if (result.state.biddingComplete) {
        const firstLeader = gameState.seatOrder[(gameState.dealerIndex + 1) % gameState.seatOrder.length];
        newState.phase = "playing";
        newState.leader = firstLeader;
        newState.currentRound = 0;
        newState.roundLeader = firstLeader;
        newState.currentTrick = initTrick(firstLeader, gameState.seatOrder);
        clearJudgementBidTimeout(gameId);
    } else if (gameState.config?.bidTimeMs) {
        // Start timer for next bidder
        const nextBidder = result.state.bidOrder[result.state.currentBidderIndex];
        scheduleJudgementBidTimeout(gameId, gameState.config.bidTimeMs, async () => {
            const currentState = getGameState(gameId);
            if (!currentState || currentState.phase !== "bidding") return;
            const autoBid = getAutoBidAmount(currentState.bidding, currentState.currentCardsPerRound);
            await applyJudgementBid(io, currentState, nextBidder, autoBid);
        });
    }

    setGameState(gameId, newState);
    await persistCheckpoint(gameId);

    if (result.state.biddingComplete) {
        io.to(gameState.roomname).emit("game-phase-change", "playing");
    }

    await broadcastGameState(io, newState);
    return { state: newState };
}

/**
 * Calculate the auto-bid amount when timer expires.
 * Bid 0 by default; bid 1 if 0 is forbidden (dealer restriction).
 */
function getAutoBidAmount(biddingState, cardsInRound) {
    const isLastBidder = biddingState.currentBidderIndex === biddingState.bidOrder.length - 1;
    if (isLastBidder) {
        const runningTotal = Object.values(biddingState.bids).reduce((s, v) => s + v, 0);
        const forbidden = cardsInRound - runningTotal;
        if (forbidden === 0) return cardsInRound > 0 ? 1 : 0;
    }
    return 0;
}

const handler = wrapHandler("game-judgement-bid", async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) { if (callback) callback(error); return; }

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

    // Cancel any pending bid timer for this game (player bid manually)
    clearJudgementBidTimeout(gameState.gameId);

    const result = await applyJudgementBid(io, gameState, socket.user.id, amount);
    if (result.error) {
        if (callback) callback(result.error);
    }
});

handler.applyJudgementBid = applyJudgementBid;
handler.getAutoBidAmount = getAutoBidAmount;
module.exports = handler;
