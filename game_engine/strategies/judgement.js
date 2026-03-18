/**
 * Judgement (Katchufool) game strategy.
 *
 * Implements the strategy interface consumed by socket handlers so they
 * can stay game-type-agnostic.
 */

const { SHUFFLE_DEALING_CONFIG } = require("../config");
const { createDeck } = require("../deck");
const { computeJudgementConfig } = require("../judgement/config");
const { computeTrumpSuit, dealJudgementRound, getNextJudgementRound } = require("../judgement/rounds");
const { initJudgementBidding } = require("../judgement/bidding");
const { calculateJudgementRoundResult, applyJudgementScoring } = require("../judgement/scoring");

// ── Config ──────────────────────────────────────────────────────────────

function computeConfig(game, playerCount, deckCount) {
    return computeJudgementConfig(
        playerCount,
        deckCount,
        game.max_cards_per_round,
        !!game.reverse_order,
        game.trump_mode || "random",
        game.scoreboard_time || null,
        game.judgement_bid_time || null,
        game.card_reveal_time || null
    );
}

function autoDeckCount(playerCount) {
    return playerCount <= 6 ? 1 : 2;
}

// ── Initial game state ──────────────────────────────────────────────────

function buildInitialState({ gameId, game, config, seatOrder, playerNames, playerAvatars, scores }) {
    const fullDeck = createDeck(config.decks);
    const tricksWon = {};
    for (const pid of seatOrder) tricksWon[pid] = 0;
    const trumpSuit = computeTrumpSuit(config.trumpMode, 0);

    return {
        gameId,
        roomname: game.roomname,
        game_type: "judgement",
        config,
        phase: "trump-announce",
        seatOrder,
        playerNames,
        playerAvatars,
        removedTwos: [],

        dealerIndex: 0,
        dealer: seatOrder[0],

        shuffleQueue: [],
        unshuffledDeck: fullDeck,

        hands: {},
        cutCard: null,
        dealingConfig: {
            animationDurationMs: SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS,
        },

        bidding: null,
        leader: null,
        currentRound: 0,
        currentTrick: null,
        tricks: [],
        roundLeader: null,

        seriesRoundIndex: 0,
        currentCardsPerRound: config.roundSequence[0],
        totalRoundsInSeries: config.totalRounds,
        trumpCard: null,
        trumpSuit,
        tricksWon,
        roundResults: [],
        scores,
        nextRoundReady: [],
    };
}

function initialDbState() {
    return "trump-announce";
}

// ── Post-start hooks ────────────────────────────────────────────────────

function afterStart(io, gameState, { scheduleJudgementAdvance, proceedFromTrumpAnnounce }) {
    io.to(gameState.roomname).emit("game-phase-change", "trump-announce");
    scheduleJudgementAdvance(gameState.gameId, 5000, () => proceedFromTrumpAnnounce(io, gameState.gameId));
}

// ── Deal ─────────────────────────────────────────────────────────────

function deal(processedDeck, gameState) {
    const dealt = dealJudgementRound(
        processedDeck,
        gameState.seatOrder,
        gameState.currentCardsPerRound,
        gameState.dealerIndex
    );

    const bidding = initJudgementBidding(gameState.seatOrder, gameState.dealerIndex);

    return {
        hands: dealt.hands,
        bidding,
        trumpCard: null,
        trumpSuit: gameState.trumpSuit, // preserve existing from trump-announce
    };
}

function applyDealExtras(gameState /*, dealResult */) {
    gameState.trumpCard = null;
    // trumpSuit stays unchanged (already set from trump-announce)
}

function transitionToBidding(gameState) {
    const cardRevealMs = gameState.config?.cardRevealTimeMs ?? 10000;

    gameState.phase = "bidding";
    gameState.currentRound = 0;
    if (gameState.bidding) {
        gameState.bidding.biddingWindowOpensAt = Date.now() + cardRevealMs;
    }

    return {
        type: "judgement",
        cardRevealMs,
    };
}

// ── Play card: scoring ──────────────────────────────────────────────────

function onRoundEnd(io, gameState, newState) {
    const deltas = calculateJudgementRoundResult(
        newState.bidding?.bids || {},
        newState.tricksWon || {}
    );
    const nextScores = applyJudgementScoring(newState.scores || {}, deltas);
    const roundEntry = {
        roundNumber: (newState.seriesRoundIndex || 0) + 1,
        bids: { ...(newState.bidding?.bids || {}) },
        tricksWon: { ...(newState.tricksWon || {}) },
        deltas,
        cumulative: nextScores,
        trumpCard: newState.trumpCard || null,
        trumpSuit: newState.trumpSuit || null,
    };

    const nextRound = getNextJudgementRound(newState);

    return {
        ...newState,
        scores: nextScores,
        scoringResult: null,
        roundResults: [...(newState.roundResults || []), roundEntry],
        phase: nextRound.done ? "series-finished" : "finished",
        nextRoundReady: [],
    };
}

function afterRoundEnd(io, gameState, finalState, { scheduleJudgementAdvance, autoNextJudgementRound }) {
    io.to(gameState.roomname).emit("game-phase-change", finalState.phase);

    if (finalState.phase === "finished") {
        const scoreboardTimeMs = finalState.config?.scoreboardTimeMs || 5000;
        scheduleJudgementAdvance(gameState.gameId, scoreboardTimeMs, () => autoNextJudgementRound(io, gameState.gameId));
    }
}

// ── Next round (manual all-ready) ───────────────────────────────────────

async function nextRound(io, gameId, existingState, deps) {
    const { clearJudgementAdvance, autoNextJudgementRound } = deps;
    clearJudgementAdvance(gameId);
    await autoNextJudgementRound(io, gameId);
}

// ── Public-view builder (for broadcastState) ────────────────────────────

function buildPublicView(gameState, handSizes) {
    return {
        gameId: gameState.gameId,
        game_type: "judgement",
        phase: gameState.phase,
        config: gameState.config,
        seatOrder: gameState.seatOrder,
        playerNames: gameState.playerNames || {},
        removedTwos: gameState.removedTwos || [],

        dealer: gameState.dealer || null,
        dealerIndex: gameState.dealerIndex ?? 0,
        shuffleQueue: gameState.shuffleQueue || [],
        dealingConfig: gameState.dealingConfig || null,

        bidding: gameState.bidding
            ? {
                  bids: gameState.bidding.bids || {},
                  bidOrder: gameState.bidding.bidOrder || [],
                  currentBidderIndex: gameState.bidding.currentBidderIndex ?? 0,
                  biddingComplete: !!gameState.bidding.biddingComplete,
                  totalBids: gameState.bidding.totalBids || 0,
                  biddingWindowOpensAt: gameState.bidding.biddingWindowOpensAt || null,
              }
            : null,

        leader: gameState.leader || null,
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

        scores: gameState.scores || {},
        scoringResult: gameState.scoringResult || null,

        trumpCard: gameState.trumpCard || null,
        trumpSuit: gameState.trumpSuit || null,
        tricksWon: gameState.tricksWon || {},
        currentCardsPerRound: gameState.currentCardsPerRound || 0,
        seriesRoundIndex: gameState.seriesRoundIndex || 0,
        totalRoundsInSeries: gameState.totalRoundsInSeries || gameState.config?.totalRounds || 0,
        roundResults: gameState.roundResults || [],

        scoreboardTimeMs: gameState.config?.scoreboardTimeMs || 5000,
        trumpMode: gameState.config?.trumpMode || "random",
        bidTimeMs: gameState.config?.bidTimeMs ?? null,
        cardRevealTimeMs: gameState.config?.cardRevealTimeMs ?? 10000,
        // Expose round progress as game series fields for ShufflingPanel
        currentGameNumber: (gameState.seriesRoundIndex || 0) + 1,
        totalGames: gameState.totalRoundsInSeries || gameState.config?.totalRounds || 1,
    };
}

// ── Register ────────────────────────────────────────────────────────────

const { registerStrategy } = require("../gameRegistry");

registerStrategy("judgement", {
    type: "judgement",
    computeConfig,
    autoDeckCount,
    buildInitialState,
    initialDbState,
    afterStart,
    deal,
    applyDealExtras,
    transitionToBidding,
    onRoundEnd,
    afterRoundEnd,
    nextRound,
    buildPublicView,
});
