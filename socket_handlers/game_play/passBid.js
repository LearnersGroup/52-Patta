const { passBid: passBidEngine } = require("../../game_engine/bidding");
const { initBidding } = require("../../game_engine/bidding");
const { createDeck, removeTwos, dealCards } = require("../../game_engine/deck");
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

        // Everyone passed with no bids — re-deal
        if (result.redeal) {
            io.to(gameState.roomname).emit(
                "room-message",
                "All players passed! Re-dealing cards..."
            );

            const { config, seatOrder, playerNames, scores } = gameState;

            // Fresh deck and deal
            const fullDeck = createDeck(config.decks);
            const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);
            const hands = dealCards(remainingDeck, seatOrder);
            const bidding = initBidding(config, seatOrder);

            const newState = {
                ...gameState,
                removedTwos: removed,
                hands,
                bidding,
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

            if (removed.length > 0) {
                io.to(gameState.roomname).emit("game-cards-removed", removed);
            }

            return;
        }

        const newState = { ...gameState, bidding: result.state };

        // Check if bidding is complete
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
