const { placeBid: placeBidEngine } = require("../../game_engine/bidding");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { startBiddingTimer, clearBiddingTimer } = require("./helpers/biddingTimer");
const { expireBidding } = require("./helpers/expireBidding");

module.exports = (socket, io) => async (data, callback) => {
    try {
        const { gameState, error } = await findGameForSocket(socket);
        if (error) {
            if (callback) callback(error);
            return;
        }

        if (gameState.phase !== "bidding") {
            if (callback) callback("Game is not in bidding phase");
            return;
        }

        const amount = parseInt(data?.amount, 10);
        if (isNaN(amount)) {
            if (callback) callback("Invalid bid amount");
            return;
        }

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

    } catch (err) {
        if (callback) callback("An error occurred");
        console.error("Place bid error:", err.message);
    }
};
