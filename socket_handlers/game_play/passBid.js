const { passBid: passBidEngine } = require("../../game_engine/bidding");
const { createDeck, removeTwos } = require("../../game_engine/deck");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");

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

        // Minor 5: All players passed with no bids → re-enter SHUFFLING with same dealer.
        // This re-runs the full shuffle → deal → bid cycle without rotating the dealer.
        if (result.redeal) {
            io.to(gameState.roomname).emit(
                "room-message",
                "All players passed! Reshuffling with same dealer..."
            );

            // Prepare a fresh unshuffled deck so the dealer can shuffle+deal again
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
            await broadcastGameState(io, newState);
            io.to(gameState.roomname).emit("game-phase-change", "shuffling");

            if (removed.length > 0) {
                io.to(gameState.roomname).emit("game-cards-removed", removed);
            }

            return;
        }

        const newState = { ...gameState, bidding: result.state };

        // Check if bidding is complete (only one bidder remains)
        if (result.state.biddingComplete) {
            newState.leader = result.state.currentBidder;
            newState.phase = "powerhouse";
            newState.teams.bid = [result.state.currentBidder];
            newState.teams.oppose = gameState.seatOrder.filter(
                (id) => id !== result.state.currentBidder
            );
        }

        setGameState(gameState.gameId, newState);

        if (newState.phase === "powerhouse") {
            await persistCheckpoint(gameState.gameId);
            io.to(gameState.roomname).emit("game-phase-change", "powerhouse");
        }

        await broadcastGameState(io, newState);

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Pass bid error:", error.message);
    }
};
