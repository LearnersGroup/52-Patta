const User = require("../../models/User");
const Game = require("../../models/Game");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { processShuffleBatch } = require("../../game_engine/shuffle");
const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { startBiddingTimer } = require("./helpers/biddingTimer");
const { expireBidding } = require("./helpers/expireBidding");
const { scheduleJudgementBidTimeout } = require("./helpers/judgementTimers");
const { initRecording } = require("../../game_engine/recording");
const wrapHandler = require('../wrapHandler');

require("../../game_engine/strategies");
const { getStrategy } = require("../../game_engine/gameRegistry");

module.exports = wrapHandler('game-deal', async (socket, io, data, callback) => {
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

        if (gameState.shuffleQueue.length === 0) {
            if (callback) callback("Must shuffle at least once before dealing");
            return;
        }

        const strategy = getStrategy(gameState.game_type);

        // Process the entire shuffle batch (no cut)
        const { deck: processedDeck } = processShuffleBatch(
            gameState.unshuffledDeck,
            gameState.shuffleQueue,
            "deal"
        );

        // Deal cards via strategy
        const dealResult = strategy.deal(processedDeck, gameState);

        // Update game state to dealing phase
        gameState.phase = "dealing";
        gameState.hands = dealResult.hands;
        gameState.cutCard = null;
        gameState.bidding = dealResult.bidding;

        // Apply game-specific deal extras (e.g. trumpCard for judgement)
        strategy.applyDealExtras(gameState, dealResult);

        // Clear shuffle working data
        gameState.unshuffledDeck = [];
        gameState.shuffleQueue = [];

        // Initialize recording for this deal (captures hands + hand metrics).
        // Safe to call unconditionally: resets any prior recording for next round.
        initRecording(gameState);

        setGameState(gameId, gameState);

        // Persist checkpoint
        await Game.findByIdAndUpdate(gameId, { state: "dealing" });
        await persistCheckpoint(gameId);

        // Broadcast personalized state (each player gets their hand in deal order)
        await broadcastGameState(io, gameState);

        io.to(gameState.roomname).emit("game-phase-change", "dealing");

        // After dealing animation completes, transition to bidding
        const totalDelay = SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS;

        setTimeout(async () => {
            // Verify we're still in dealing phase (in case of quit/disconnect)
            const currentState = getGameState(gameId);
            if (!currentState || currentState.phase !== "dealing") return;

            const currentStrategy = getStrategy(currentState.game_type);

            // Strategy mutates currentState and returns transition info
            const transition = currentStrategy.transitionToBidding(currentState);

            setGameState(gameId, currentState);

            await Game.findByIdAndUpdate(gameId, { state: "bidding" });
            await persistCheckpoint(gameId);

            await broadcastGameState(io, currentState);
            io.to(currentState.roomname).emit("game-phase-change", "bidding");

            // Game-specific bidding timer setup
            if (transition.type === "judgement") {
                // Start per-player bid timer if configured
                if (currentState.config?.bidTimeMs) {
                    const firstBidder = currentState.bidding?.bidOrder?.[0];
                    if (firstBidder) {
                        const { applyJudgementBid, getAutoBidAmount } = require('./judgementBid');
                        scheduleJudgementBidTimeout(gameId, currentState.config.bidTimeMs, async () => {
                            const { getGameState: gs } = require('../../game_engine/stateManager');
                            const st = gs(gameId);
                            if (!st || st.phase !== 'bidding') return;
                            const autoBid = getAutoBidAmount(st.bidding, st.currentCardsPerRound);
                            await applyJudgementBid(io, st, firstBidder, autoBid);
                        });
                    }
                }
            } else {
                // Kaliteri: start the expiry timer (reveal window + bidding window)
                startBiddingTimer(gameId, transition.timerDelayMs, () => expireBidding(io, gameId));
            }
        }, totalDelay);
});
