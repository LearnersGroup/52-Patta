const { passBid: passBidEngine } = require("../../game_engine/bidding");
const { createDeck, removeTwos } = require("../../game_engine/deck");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { clearBiddingTimer } = require("./helpers/biddingTimer");
const { recordKaliteriBidEvent, recordKaliteriBiddingComplete } = require("../../game_engine/recording");
const Game = require("../../models/Game");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler('game-pass-bid', async (socket, io, data, callback) => {
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
        if (callback) callback("Pass is not used in Judgement bidding");
        return;
    }

    const preBid = {
        currentHighBid: gameState.bidding?.currentBid || 0,
        currentHighBidder: gameState.bidding?.currentBidder || null,
    };

    const result = passBidEngine(
        gameState.bidding,
        gameState.seatOrder,
        gameState.config,
        socket.user.id
    );

    if (result.error) {
        if (callback) callback(result.error);
        return;
    }

    // Record the pass event regardless of outcome.
    recordKaliteriBidEvent(gameState, {
        type: "pass",
        playerId: socket.user.id,
        currentHighBid: preBid.currentHighBid,
        currentHighBidder: preBid.currentHighBidder,
    });

    // ── All players passed with no bids → reshuffle (same dealer) ─────
    if (result.redeal) {
        clearBiddingTimer(gameState.gameId);

        io.to(gameState.roomname).emit(
            "room-message",
            "All players passed! Reshuffling with same dealer..."
        );

        const { config, seatOrder } = gameState;
        const fullDeck = createDeck(config.decks);
        const { remainingDeck, removedTwos: removed } = removeTwos(
            fullDeck,
            config.removeTwos
        );

        const newState = {
            ...gameState,
            phase: "shuffling",
            unshuffledDeck: remainingDeck,
            removedTwos: removed,
            hands: {},
            handSizes: {},
            shuffleQueue: [],
            bidding: null,
            cutCard: null,
            leader: null,
            powerHouseSuit: null,
            partnerCards: [],
            teams: { bid: [], oppose: [...seatOrder] },
            revealedPartners: [],
            currentRound: 0,
            currentTrick: null,
            tricks: [],
            roundLeader: null,
        };

        setGameState(gameState.gameId, newState);
        await Game.findByIdAndUpdate(gameState.gameId, { state: "shuffling" });
        await broadcastGameState(io, newState);
        io.to(gameState.roomname).emit("game-phase-change", "shuffling");

        if (removed.length > 0) {
            io.to(gameState.roomname).emit("game-cards-removed", removed);
        }

        return;
    }

    const newState = { ...gameState, bidding: result.state };

    // ── Only one active player left and someone has bid → complete ─────
    if (result.state.biddingComplete) {
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
            endReason: "all-passed",
        });

        setGameState(gameState.gameId, newState);
        await persistCheckpoint(gameState.gameId);
        io.to(gameState.roomname).emit("game-phase-change", "powerhouse");

    } else {
        // ── Normal pass: update state, timer keeps running ──────────────
        setGameState(gameState.gameId, newState);
    }

    await broadcastGameState(io, newState);
});
