const Game = require("../../models/Game");
const User = require("../../models/User");
const { getConfig, SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { createDeck, removeTwos } = require("../../game_engine/deck");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");

module.exports = (socket, io) => async (data, callback) => {
    try {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const game = await Game.findById(user.gameroom)
            .populate("players.playerId", ["name"]);
        if (!game) {
            if (callback) callback("Game room not found");
            return;
        }

        // Only admin can start the game
        if (game.admin.toString() !== socket.user.id) {
            if (callback) callback("Only the room admin can start the game");
            return;
        }

        // Check game is still in lobby state
        if (game.state !== "lobby") {
            if (callback) callback("Game has already started");
            return;
        }

        // Check all players are ready
        const allReady = game.players.every((p) => p.ready);
        if (!allReady) {
            if (callback) callback("All players must be ready");
            return;
        }

        const playerCount = game.players.length;
        if (playerCount < game.player_count) {
            if (callback) callback(`Need ${game.player_count} players to start (${playerCount} joined)`);
            return;
        }

        // Determine deck count
        let deckCount = game.deck_count;
        if (!deckCount) {
            deckCount = playerCount <= 5 ? 1 : 2;
        }

        // Get config
        let config;
        try {
            config = getConfig(playerCount, deckCount);
        } catch (err) {
            if (callback) callback(err.message);
            return;
        }

        // Override bid threshold if room creator set a custom value
        if (game.bid_threshold && config.bidThreshold !== null) {
            config.bidThreshold = game.bid_threshold;
        }

        // Inject custom bidding window (ms) — falls back to SHUFFLE_DEALING_CONFIG default
        config.biddingWindowMs = game.bid_window
            ? game.bid_window * 1000
            : SHUFFLE_DEALING_CONFIG.BIDDING_WINDOW_MS;

        // Build seat order and player name map from player list (clockwise)
        const seatOrder = game.players.map((p) => p.playerId._id.toString());
        const playerNames = {};
        for (const p of game.players) {
            playerNames[p.playerId._id.toString()] = p.playerId.name;
        }

        // Create and prepare deck (but do NOT shuffle or deal — that's the dealer's job now)
        const fullDeck = createDeck(config.decks);
        const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);

        // Initialize scores
        const scores = {};
        for (const pid of seatOrder) {
            scores[pid] = 0;
        }

        // Determine total games (from room setting or default to player count)
        const totalGames = game.game_count || playerCount;

        // Build initial game state — shuffling phase (not bidding)
        const gameId = game._id.toString();
        const gameState = {
            gameId,
            roomname: game.roomname,
            config,
            phase: "shuffling",
            seatOrder,
            playerNames,
            removedTwos: removed,

            // Dealer system — admin is first dealer
            dealerIndex: 0,
            dealer: seatOrder[0],

            // Shuffling state
            shuffleQueue: [],
            unshuffledDeck: remainingDeck,

            // These will be populated after dealing
            hands: {},
            cutCard: null,
            dealingConfig: {
                animationDurationMs: SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS,
                cutCardRevealMs: SHUFFLE_DEALING_CONFIG.CUT_CARD_REVEAL_MS,
            },

            // Game series tracking
            currentGameNumber: 1,
            totalGames,

            // Bidding & gameplay state (populated after dealing)
            bidding: null,
            leader: null,
            powerHouseSuit: null,
            partnerCards: [],
            teams: {
                bid: [],
                oppose: [...seatOrder],
            },
            revealedPartners: [],
            currentRound: 0,
            currentTrick: null,
            tricks: [],
            roundLeader: null,
            scores,
        };

        // Store in memory
        setGameState(gameId, gameState);

        // Update game state in MongoDB
        await Game.findByIdAndUpdate(gameId, { state: "shuffling" });
        await persistCheckpoint(gameId);

        // Broadcast personalized state to all players
        await broadcastGameState(io, gameState);

        // Notify room about removed cards
        if (removed.length > 0) {
            io.to(game.roomname).emit("game-cards-removed", removed);
        }

        io.to(game.roomname).emit("game-phase-change", "shuffling");

    } catch (error) {
        if (callback) callback("An error occurred starting the game");
        console.error("Start game error:", error.message);
    }
};
