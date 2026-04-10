const { placeBid: placeBidEngine } = require("../../game_engine/bidding");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { startBiddingTimer, clearBiddingTimer } = require("./helpers/biddingTimer");
const { expireBidding } = require("./helpers/expireBidding");
const { recordKaliteriBidEvent, recordKaliteriBiddingComplete } = require("../../game_engine/recording");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler('game-place-bid', async (socket, io, data, callback) => {
    const { gameState, error } = await findGameForSocket(socket);
    if (error) {
        if (callback) callback(error);
        return;
    }

    if (gameState.phase !== "bidding") {
        if (callback) callback("Game is not in bidding phase");
        return;
    }

    if (gameState.game_type === "judgement") {
        if (callback) callback("Use Judgement bidding for this game mode");
        return;
    }

    const amount = parseInt(data?.amount, 10);
    if (isNaN(amount)) {
        if (callback) callback("Invalid bid amount");
        return;
    }

    // Snapshot pre-bid context for recording (current high bid before this call).
    const preBid = {
        currentHighBid: gameState.bidding?.currentBid || 0,
        currentHighBidder: gameState.bidding?.currentBidder || null,
        minBid: (gameState.bidding?.currentBid || 0) === 0
            ? gameState.bidding?.startingBid
            : (gameState.bidding.currentBid + gameState.config.bidIncrement),
    };

    const result = placeBidEngine(
        gameState.bidding,
        gameState.seatOrder,
        gameState.config,
        socket.user.id,
        amount
    );

    if (result.error) {
        if (callback) callback(result.error);
        return;
    }

    // Record the accepted bid event.
    recordKaliteriBidEvent(gameState, {
        type: "bid",
        playerId: socket.user.id,
        amount,
        currentHighBid: preBid.currentHighBid,
        currentHighBidder: preBid.currentHighBidder,
        minBid: preBid.minBid,
    });

    const newState = { ...gameState, bidding: result.state };

    if (result.state.biddingComplete) {
        // ── Max bid hit: instant win → powerhouse ──────────────────────
        clearBiddingTimer(gameState.gameId);

        newState.leader = result.state.currentBidder;
        newState.phase = "powerhouse";
        newState.teams.bid = [result.state.currentBidder];
        newState.teams.oppose = gameState.seatOrder.filter(
            (id) => id !== result.state.currentBidder
        );

        recordKaliteriBiddingComplete(newState, {
            winner: result.state.currentBidder,
            amount: result.state.currentBid,
            endReason: "max-bid",
        });

        setGameState(gameState.gameId, newState);
        await persistCheckpoint(gameState.gameId);
        io.to(gameState.roomname).emit("game-phase-change", "powerhouse");

    } else {
        // ── Normal bid: refresh the bidding window (per-room or default) ─
        const windowMs = gameState.config?.biddingWindowMs
            || SHUFFLE_DEALING_CONFIG.BIDDING_WINDOW_MS;
        newState.bidding.biddingExpiresAt = Date.now() + windowMs;

        setGameState(gameState.gameId, newState);

        // Restart timer: fresh 15s from this bid
        startBiddingTimer(gameState.gameId, windowMs, () => expireBidding(io, gameState.gameId));
    }

    await broadcastGameState(io, newState);
});
