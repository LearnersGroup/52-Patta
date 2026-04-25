/**
 * Kaliteri (Patta) game strategy.
 *
 * Implements the strategy interface consumed by socket handlers so they
 * can stay game-type-agnostic.
 */

const { getConfig, SHUFFLE_DEALING_CONFIG } = require("../config");
const { createDeck, removeTwos } = require("../deck");
const { dealFromDealer } = require("../shuffle");
const { initBidding } = require("../bidding");
const { calculateGameResult, applyScoring } = require("../scoring");
const { finalizeKaliteriResult, persistRecording } = require("../recording");

// ── Config ──────────────────────────────────────────────────────────────

function computeConfig(game, playerCount, deckCount) {
    const config = getConfig(playerCount, deckCount);

    // Override bid threshold if room creator set a custom value
    if (game.bid_threshold && config.bidThreshold !== null) {
        config.bidThreshold = game.bid_threshold;
    }

    // Inject custom bidding window (ms)
    config.biddingWindowMs = game.bid_window
        ? game.bid_window * 1000
        : SHUFFLE_DEALING_CONFIG.BIDDING_WINDOW_MS;

    // Inject custom card inspect window (ms)
    config.inspectWindowMs = game.inspect_time
        ? game.inspect_time * 1000
        : SHUFFLE_DEALING_CONFIG.BIDDING_REVEAL_MS;

    return config;
}

function autoDeckCount(playerCount) {
    return playerCount <= 5 ? 1 : 2;
}

// ── Initial game state ──────────────────────────────────────────────────

function buildInitialState({ gameId, game, config, seatOrder, playerNames, playerAvatars, scores }) {
    const fullDeck = createDeck(config.decks);
    const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);
    const totalGames = game.game_count || seatOrder.length;

    return {
        gameId,
        roomname: game.roomname,
        game_type: "kaliteri",
        autoplay: game.autoplay ?? true,
        config,
        phase: "shuffling",
        seatOrder,
        playerNames,
        playerAvatars,
        removedTwos: removed,

        dealerIndex: 0,
        dealer: seatOrder[0],

        shuffleQueue: [],
        unshuffledDeck: remainingDeck,

        hands: {},
        cutCard: null,
        dealingConfig: {
            animationDurationMs: SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS,
        },

        currentGameNumber: 1,
        totalGames,

        bidding: null,
        leader: null,
        powerHouseSuit: null,
        partnerCards: [],
        teams: { bid: [], oppose: [...seatOrder] },
        revealedPartners: [],
        currentRound: 0,
        currentTrick: null,
        tricks: [],
        roundLeader: null,
        scores,
    };
}

/** The initial DB state after startGame. */
function initialDbState() {
    return "shuffling";
}

// ── Post-start hooks ────────────────────────────────────────────────────

function afterStart(io, gameState) {
    if (gameState.removedTwos.length > 0) {
        io.to(gameState.roomname).emit("game-cards-removed", gameState.removedTwos);
    }
    io.to(gameState.roomname).emit("game-phase-change", "shuffling");
}

// ── Deal ─────────────────────────────────────────────────────────────

function deal(processedDeck, gameState) {
    const { hands } = dealFromDealer(
        processedDeck,
        gameState.seatOrder,
        gameState.dealerIndex
    );

    const bidding = initBidding(gameState.config, gameState.seatOrder);

    return { hands, bidding, trumpCard: null, trumpSuit: null };
}

function applyDealExtras(gameState /*, dealResult */) {
    // No extra state changes for Kaliteri after deal
}

function transitionToCardReveal(gameState) {
    const revealMs = gameState.config?.inspectWindowMs
        || SHUFFLE_DEALING_CONFIG.BIDDING_REVEAL_MS;
    gameState.phase = "card-reveal";
    gameState.cutCard = null;
    return { revealMs };
}

function transitionFromCardReveal(gameState) {
    const windowMs = gameState.config?.biddingWindowMs
        || SHUFFLE_DEALING_CONFIG.BIDDING_WINDOW_MS;
    gameState.phase = "bidding";
    gameState.bidding.biddingWindowOpensAt = Date.now();
    gameState.bidding.biddingExpiresAt = Date.now() + windowMs;
    return { type: "kaliteri", nextPhase: "bidding", timerDelayMs: windowMs };
}

// ── Play card: scoring ──────────────────────────────────────────────────

function onRoundEnd(io, gameState, newState) {
    const scoringResult = calculateGameResult(newState);
    const newScores = applyScoring(newState.scores, scoringResult);

    const finalState = {
        ...newState,
        scores: newScores,
        scoringResult,
        phase: "finished",
    };

    // Finalize the analytics record with the resolved outcome.
    finalizeKaliteriResult(finalState, scoringResult);

    return finalState;
}

function afterRoundEnd(io, gameState, finalState, { scheduleAutoNextGame }) {
    io.to(gameState.roomname).emit("game-phase-change", "finished");
    io.to(gameState.roomname).emit("game-result", finalState.scoringResult);

    // Persist the completed game record (best-effort, never blocks gameplay).
    persistRecording(finalState).then((recordId) => {
        if (recordId) {
            io.to(gameState.roomname).emit("game-record-saved", {
                recordId: recordId.toString(),
                gameType: "kaliteri",
            });
        }
    }).catch(() => { /* logged inside persistRecording */ });

    scheduleAutoNextGame(io, gameState.gameId);
}

// ── Next round (manual all-ready) ───────────────────────────────────────

async function nextRound(io, gameId, existingState, deps) {
    const { Game, setGameState, persistCheckpoint, broadcastGameState } = deps;

    const game = await Game.findById(gameId).populate("players.playerId", ["name"]);
    if (!game) return;

    const { config, seatOrder, playerNames, playerAvatars, scores } = existingState;

    const fullDeck = createDeck(config.decks);
    const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);

    const { dealCards } = require("../deck");
    const hands = dealCards(remainingDeck, seatOrder);
    const bidding = initBidding(config, seatOrder);

    const newGameState = {
        gameId,
        roomname: existingState.roomname,
        autoplay: existingState.autoplay ?? true,
        config,
        phase: "bidding",
        seatOrder,
        playerNames,
        playerAvatars: playerAvatars || {},
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
        scores,
    };

    setGameState(gameId, newGameState);

    await Game.findByIdAndUpdate(gameId, { state: "bidding" });
    await persistCheckpoint(gameId);

    await broadcastGameState(io, newGameState);
    io.to(existingState.roomname).emit("game-avatars", playerAvatars || {});

    if (removed.length > 0) {
        io.to(existingState.roomname).emit("game-cards-removed", removed);
    }

    io.to(existingState.roomname).emit("game-phase-change", "bidding");
}

// ── Public-view builder (for broadcastState) ────────────────────────────

function buildPublicView(gameState, handSizes) {
    const { getPartnerCardCount } = require("../powerhouse");

    return {
        gameId: gameState.gameId,
        game_type: "kaliteri",
        autoplay: gameState.autoplay ?? true,
        phase: gameState.phase,
        configKey: gameState.config?.key,
        seatOrder: gameState.seatOrder,
        playerNames: gameState.playerNames || {},
        removedTwos: gameState.removedTwos,

        dealer: gameState.dealer || null,
        dealerIndex: gameState.dealerIndex ?? 0,
        shuffleQueue: gameState.shuffleQueue || [],
        dealingConfig: gameState.dealingConfig || null,

        currentGameNumber: gameState.currentGameNumber || 1,
        totalGames: gameState.totalGames || 1,
        finalRankings: gameState.finalRankings || [],

        bidding: gameState.bidding
            ? {
                  currentBid:           gameState.bidding.currentBid,
                  currentBidder:        gameState.bidding.currentBidder,
                  passed:               gameState.bidding.passes || [],
                  startingBid:          gameState.bidding.startingBid,
                  biddingComplete:      gameState.bidding.biddingComplete,
                  increment:            gameState.config?.bidIncrement || 5,
                  maxBid:               gameState.config?.bidMax || 500,
                  biddingWindowMs:      gameState.config?.biddingWindowMs || 15000,
                  biddingWindowOpensAt: gameState.bidding.biddingWindowOpensAt,
                  biddingExpiresAt:     gameState.bidding.biddingExpiresAt,
              }
            : null,
        leader: gameState.leader,
        powerHouseSuit: gameState.powerHouseSuit,
        partnerCardCount: gameState.bidding ? getPartnerCardCount(gameState) : null,
        partnerCards: (gameState.partnerCards || []).map((pc) => ({
            card: pc.card,
            whichCopy: pc.whichCopy,
            revealed: pc.revealed,
            partnerId: pc.revealed ? pc.partnerId : null,
        })),
        teams: {
            bid: gameState.teams?.bid || [],
            oppose: gameState.teams?.oppose || [],
        },
        revealedPartners: gameState.revealedPartners || [],
        currentRound: gameState.currentRound,
        currentTrick: gameState.currentTrick
            ? {
                  ...gameState.currentTrick,
                  currentTurn:
                      gameState.seatOrder[gameState.currentTrick.turnIndex] || null,
              }
            : null,
        tricks: (gameState.tricks || []).map((t) => ({
            winner: t.winner,
            points: t.points,
            cards: t.cards,
        })),
        roundLeader: gameState.roundLeader,
        handSizes,
        scores: gameState.scores,
        scoringResult: gameState.scoringResult || null,
        cardRevealTimeMs: gameState.config?.inspectWindowMs
            || SHUFFLE_DEALING_CONFIG.BIDDING_REVEAL_MS,
    };
}

// ── Register ────────────────────────────────────────────────────────────

const { registerStrategy } = require("../gameRegistry");

registerStrategy("kaliteri", {
    type: "kaliteri",
    computeConfig,
    autoDeckCount,
    buildInitialState,
    initialDbState,
    afterStart,
    deal,
    applyDealExtras,
    transitionToCardReveal,
    transitionFromCardReveal,
    onRoundEnd,
    afterRoundEnd,
    nextRound,
    buildPublicView,
});
