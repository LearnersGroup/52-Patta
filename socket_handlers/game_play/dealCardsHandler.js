const User = require("../../models/User");
const Game = require("../../models/Game");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { processShuffleBatch, dealFromDealer } = require("../../game_engine/shuffle");
const { initBidding } = require("../../game_engine/bidding");
const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");

module.exports = (socket, io) => async (data, callback) => {
    try {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const gameId = user.gameroom.toString();
        const gameState = getGameState(gameId);

        if (!gameState || gameState.phase !== "shuffling") {
            if (callback) callback("Not in shuffling phase");
            return;
        }

        if (gameState.dealer !== socket.user.id) {
            if (callback) callback("Only the dealer can deal");
            return;
        }

        const { dealType } = data || {};
        if (dealType !== "deal" && dealType !== "cut-and-deal") {
            if (callback) callback("Invalid deal type");
            return;
        }

        if (gameState.shuffleQueue.length === 0) {
            if (callback) callback("Must shuffle at least once before dealing");
            return;
        }

        // Process the entire shuffle batch + optional cut
        const { deck: processedDeck, cutCard } = processShuffleBatch(
            gameState.unshuffledDeck,
            gameState.shuffleQueue,
            dealType
        );

        // Deal cards starting from player next to dealer
        const { hands } = dealFromDealer(
            processedDeck,
            gameState.seatOrder,
            gameState.dealerIndex
        );

        // Initialize bidding state (will be used when dealing animation completes)
        const bidding = initBidding(gameState.config, gameState.seatOrder);

        // Update game state to dealing phase
        gameState.phase = "dealing";
        gameState.hands = hands;
        gameState.cutCard = cutCard;
        gameState.bidding = bidding;
        // Clear shuffle working data
        gameState.unshuffledDeck = [];
        gameState.shuffleQueue = [];

        setGameState(gameId, gameState);

        // Persist checkpoint
        await Game.findByIdAndUpdate(gameId, { state: "dealing" });
        await persistCheckpoint(gameId);

        // Broadcast personalized state (each player gets their hand in deal order)
        await broadcastGameState(io, gameState);

        // If cut-and-deal, send cut card to dealer only
        if (cutCard) {
            const sockets = await io.in(gameState.roomname).fetchSockets();
            const dealerSocket = sockets.find(s => s.user?.id === gameState.dealer);
            if (dealerSocket) {
                dealerSocket.emit("game-cut-card", cutCard);
            }
        }

        io.to(gameState.roomname).emit("game-phase-change", "dealing");

        // After dealing animation completes, transition to bidding
        const totalDelay = SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS +
            (cutCard ? SHUFFLE_DEALING_CONFIG.CUT_CARD_REVEAL_MS : 0);

        setTimeout(async () => {
            // Verify we're still in dealing phase (in case of quit/disconnect)
            const currentState = getGameState(gameId);
            if (!currentState || currentState.phase !== "dealing") return;

            currentState.phase = "bidding";
            currentState.cutCard = null; // clear cut card after reveal
            setGameState(gameId, currentState);

            await Game.findByIdAndUpdate(gameId, { state: "bidding" });
            await persistCheckpoint(gameId);

            await broadcastGameState(io, currentState);
            io.to(currentState.roomname).emit("game-phase-change", "bidding");
        }, totalDelay);

    } catch (error) {
        if (callback) callback("An error occurred dealing cards");
        console.error("Deal cards error:", error.message);
    }
};
