const User = require("../../models/User");
const Game = require("../../models/Game");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { processShuffleBatch, dealFromDealer } = require("../../game_engine/shuffle");
const { initBidding } = require("../../game_engine/bidding");
const { initJudgementBidding } = require("../../game_engine/judgement/bidding");
const { dealJudgementRound } = require("../../game_engine/judgement/rounds");
const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { startBiddingTimer } = require("./helpers/biddingTimer");
const { expireBidding } = require("./helpers/expireBidding");
const { scheduleJudgementBidTimeout } = require("./helpers/judgementTimers");
const wrapHandler = require('../wrapHandler');

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

        const isJudgement = gameState.game_type === "judgement";

        // Process the entire shuffle batch (no cut)
        const { deck: processedDeck } = processShuffleBatch(
            gameState.unshuffledDeck,
            gameState.shuffleQueue,
            "deal"
        );

        let hands;
        let bidding;
        let trumpCard = null;
        let trumpSuit = null;

        if (isJudgement) {
            const dealt = dealJudgementRound(
                processedDeck,
                gameState.seatOrder,
                gameState.currentCardsPerRound,
                gameState.dealerIndex
            );
            hands = dealt.hands;
            // trumpSuit is already set from trump-announce phase — do NOT override
            // trumpCard is null in new flow (trump is a suit, not a specific flipped card)
            trumpCard = null;
            trumpSuit = gameState.trumpSuit; // preserve existing
            bidding = initJudgementBidding(gameState.seatOrder, gameState.dealerIndex);
        } else {
            // Deal cards starting from player next to dealer
            ({ hands } = dealFromDealer(
                processedDeck,
                gameState.seatOrder,
                gameState.dealerIndex
            ));

            // Initialize bidding state (will be used when dealing animation completes)
            bidding = initBidding(gameState.config, gameState.seatOrder);
        }

        // Update game state to dealing phase
        gameState.phase = "dealing";
        gameState.hands = hands;
        gameState.cutCard = null;
        gameState.bidding = bidding;
        if (isJudgement) {
            gameState.trumpCard = null;
            // trumpSuit stays unchanged (already set from trump-announce)
        }
        // Clear shuffle working data
        gameState.unshuffledDeck = [];
        gameState.shuffleQueue = [];

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

            const currentIsJudgement = currentState.game_type === "judgement";

            if (currentIsJudgement) {
                currentState.phase = "bidding";
                currentState.currentRound = 0;
                // Stamp card-reveal window so the frontend overlay auto-closes
                const cardRevealMs = currentState.config?.cardRevealTimeMs ?? 10000;
                if (currentState.bidding) {
                    currentState.bidding.biddingWindowOpensAt = Date.now() + cardRevealMs;
                }

                setGameState(gameId, currentState);

                await Game.findByIdAndUpdate(gameId, { state: "bidding" });
                await persistCheckpoint(gameId);

                await broadcastGameState(io, currentState);
                io.to(currentState.roomname).emit("game-phase-change", "bidding");

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
                return;
            }

            // Use per-room configured inspect window if available, else the global default (15s)
            const revealMs = currentState.config?.inspectWindowMs
                || SHUFFLE_DEALING_CONFIG.BIDDING_REVEAL_MS;
            // Use per-room configured bidding window if available, else the global default (15s)
            const windowMs = currentState.config?.biddingWindowMs
                || SHUFFLE_DEALING_CONFIG.BIDDING_WINDOW_MS;

            currentState.phase = "bidding";
            currentState.cutCard = null; // clear cut card after reveal
            // Stamp the reveal window and bidding expiry on the bidding state
            currentState.bidding.biddingWindowOpensAt = Date.now() + revealMs;
            currentState.bidding.biddingExpiresAt = Date.now() + revealMs + windowMs;

            setGameState(gameId, currentState);

            await Game.findByIdAndUpdate(gameId, { state: "bidding" });
            await persistCheckpoint(gameId);

            await broadcastGameState(io, currentState);
            io.to(currentState.roomname).emit("game-phase-change", "bidding");

            // Start the expiry timer: reveal window + bidding window
            startBiddingTimer(gameId, revealMs + windowMs, () => expireBidding(io, gameId));
        }, totalDelay);
});
