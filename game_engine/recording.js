/**
 * Game Recording module.
 *
 * Captures a rich, analytics-friendly snapshot of every played deal so we can
 * later build a skill-based rating system, debug game logic, and offer players
 * post-game retrospection.
 *
 * Design:
 *  - Recording state lives on `gameState.recording` so it rides along with the
 *    in-memory state and gets picked up by existing MongoDB checkpoints.
 *  - Helper functions mutate `gameState.recording` in place and return
 *    `gameState` so callers can chain them ergonomically.
 *  - If `gameState.recording` is null (e.g., rehydrated pre-feature games),
 *    every helper is a no-op — integration is safe to add incrementally.
 *
 * Each helper captures not just "what happened" but also the context a
 * professional ML engineer would want for training and validation:
 *   - Full alternatives (valid plays, bid options) so we can compute
 *     counterfactuals.
 *   - Snapshots of team composition and partner visibility at decision time.
 *   - Per-decision timing to detect hesitation, snap decisions, and AFK.
 *   - Hand metrics for Hand Quality Index residual computation.
 */

const { getCardPoints, compareRanks } = require("./config");
const { cardsMatch } = require("./deck");

const POINT_TOTAL_SINGLE_DECK = 250;
const POINT_TOTAL_DOUBLE_DECK = 500;
const POINT_CARD_RANKS = ["10", "J", "Q", "K", "A"];

/** Compute quality metrics for a single hand. */
function computeHandMetrics(hand, totalPointsInDeck) {
    const metrics = {
        handSize: hand.length,
        pointCardValue: 0,
        handQualityIndex: 0,
        suitCounts: { S: 0, H: 0, D: 0, C: 0 },
        voidCount: 0,
        highCardCount: 0,   // 10/J/Q/K/A across all suits
        aceCount: 0,
        kingCount: 0,
        fiveCount: 0,
        hasKaliTiri: false, // 3 of Spades (Kaliteri's 30-point card)
        trumpLength: null,  // populated once trump is known
    };

    for (const c of hand) {
        metrics.pointCardValue += getCardPoints(c);
        metrics.suitCounts[c.suit] = (metrics.suitCounts[c.suit] || 0) + 1;
        if (POINT_CARD_RANKS.includes(c.rank)) metrics.highCardCount += 1;
        if (c.rank === "A") metrics.aceCount += 1;
        if (c.rank === "K") metrics.kingCount += 1;
        if (c.rank === "5") metrics.fiveCount += 1;
        if (c.suit === "S" && c.rank === "3") metrics.hasKaliTiri = true;
    }

    metrics.voidCount = Object.values(metrics.suitCounts).filter((n) => n === 0).length;
    metrics.handQualityIndex = totalPointsInDeck > 0
        ? metrics.pointCardValue / totalPointsInDeck
        : 0;

    return metrics;
}

/** Compute metrics for every player's hand. */
function computeAllHandMetrics(hands, totalPointsInDeck) {
    const out = {};
    for (const [pid, hand] of Object.entries(hands || {})) {
        out[pid] = computeHandMetrics(hand, totalPointsInDeck);
    }
    return out;
}

/**
 * Initialize a fresh recording on the game state.
 * Called right after dealing so we have hands to snapshot.
 */
function initRecording(gameState) {
    const isJudgement = gameState.game_type === "judgement";
    const totalPointsInDeck = isJudgement
        ? 0
        : (gameState.config?.decks === 2 ? POINT_TOTAL_DOUBLE_DECK : POINT_TOTAL_SINGLE_DECK);

    const initialHands = {};
    for (const [pid, hand] of Object.entries(gameState.hands || {})) {
        initialHands[pid] = hand.map((c) => ({ ...c }));
    }

    gameState.recording = {
        gameType: gameState.game_type,
        startedAt: Date.now(),
        lastEventAt: Date.now(),

        // Series position
        currentGameNumber: gameState.currentGameNumber || null,
        totalGames: gameState.totalGames || null,
        seriesRoundIndex: gameState.seriesRoundIndex ?? null,
        totalRoundsInSeries: gameState.totalRoundsInSeries || null,

        // Config snapshot (only the fields useful for analysis)
        config: {
            key: gameState.config?.key || null,
            playerCount: gameState.seatOrder?.length || null,
            deckCount: gameState.config?.decks || null,
            rounds: gameState.config?.rounds || null,
            bidStart: gameState.config?.bidStart || null,
            bidMax: gameState.config?.bidMax || null,
            bidIncrement: gameState.config?.bidIncrement || null,
            bidThreshold: gameState.config?.bidThreshold || null,
            partnerCards: gameState.config?.partnerCards || null,
            trumpMode: gameState.config?.trumpMode || null,
            cardsPerRound: gameState.currentCardsPerRound || gameState.config?.rounds || null,
        },

        seatOrder: [...(gameState.seatOrder || [])],
        playerNames: { ...(gameState.playerNames || {}) },
        dealer: gameState.dealer || null,
        dealerIndex: gameState.dealerIndex ?? null,

        removedTwos: (gameState.removedTwos || []).map((c) => ({ ...c })),
        initialHands,
        totalPointsInDeck,
        handMetrics: computeAllHandMetrics(initialHands, totalPointsInDeck),

        // Judgement: capture trump info at deal time
        trumpSuitAtDeal: !isJudgement ? null : gameState.trumpSuit || null,
        trumpCardAtDeal: !isJudgement ? null : (gameState.trumpCard ? { ...gameState.trumpCard } : null),

        bidding: {
            bidEvents: [],           // Kaliteri: sequence of bid/pass events
            judgementBids: {},       // Judgement: { playerId: amount }
            judgementBidOrder: [],   // Judgement: order in which bids were placed
            judgementBidDetails: [], // Judgement: per-bid options/timing
            finalBid: null,
            bidWinner: null,
            passedPlayers: [],
        },

        powerhouse: null, // Kaliteri only, filled on trump + partner selection
        tricks: [],
        result: null,

        endedAt: null,
        durationMs: null,
    };

    return gameState;
}

// ── Bidding ────────────────────────────────────────────────────────────────

/**
 * Record a Kaliteri bid/pass event.
 * event = { type: "bid"|"pass", playerId, amount?, currentHighBid, currentHighBidder, minBid }
 */
function recordKaliteriBidEvent(gameState, event) {
    const rec = gameState?.recording;
    if (!rec) return gameState;
    const now = Date.now();
    rec.bidding.bidEvents.push({
        type: event.type,
        playerId: event.playerId,
        amount: event.amount ?? null,
        timestamp: now,
        timeSincePreviousMs: now - rec.lastEventAt,
        currentHighBidBefore: event.currentHighBid ?? 0,
        currentHighBidderBefore: event.currentHighBidder ?? null,
        minBidAllowed: event.minBid ?? null,
    });
    if (event.type === "pass") {
        rec.bidding.passedPlayers.push(event.playerId);
    }
    rec.lastEventAt = now;
    return gameState;
}

/** Finalize Kaliteri bidding outcome. */
function recordKaliteriBiddingComplete(gameState, { winner, amount, endReason }) {
    const rec = gameState?.recording;
    if (!rec) return gameState;
    rec.bidding.finalBid = amount;
    rec.bidding.bidWinner = winner;
    rec.bidding.endReason = endReason; // "max-bid" | "all-passed" | "timer-expired"
    rec.lastEventAt = Date.now();
    return gameState;
}

/**
 * Record a Judgement bid including the options the player could have chosen.
 * @param {object} gameState
 * @param {string} playerId
 * @param {number} amount
 * @param {{ cardsInRound: number, forbidden: number|null }} ctx
 */
function recordJudgementBid(gameState, playerId, amount, ctx) {
    const rec = gameState?.recording;
    if (!rec) return gameState;
    const now = Date.now();
    const cardsInRound = ctx?.cardsInRound ?? 0;
    const forbidden = ctx?.forbidden ?? null;

    // Valid bid options are 0..cardsInRound excluding forbidden (last bidder only)
    const validOptions = [];
    for (let i = 0; i <= cardsInRound; i += 1) {
        if (forbidden !== null && i === forbidden) continue;
        validOptions.push(i);
    }

    rec.bidding.judgementBids[playerId] = amount;
    rec.bidding.judgementBidOrder.push(playerId);
    rec.bidding.judgementBidDetails.push({
        playerId,
        amount,
        validOptions,
        forbidden,
        cardsInRound,
        timestamp: now,
        timeToBidMs: now - rec.lastEventAt,
        bidsSoFar: { ...rec.bidding.judgementBids },
    });
    rec.lastEventAt = now;
    return gameState;
}

// ── Powerhouse (Kaliteri only) ─────────────────────────────────────────────

/** Record the trump suit selection and its decision time. */
function recordTrumpSelection(gameState, trumpSuit) {
    const rec = gameState?.recording;
    if (!rec) return gameState;
    const now = Date.now();
    rec.powerhouse = {
        trumpSuit,
        trumpSelectionTimeMs: now - rec.lastEventAt,
        partnerCards: [],
        partnerSelectionTimeMs: null,
        partnerCardOwners: [],
    };

    // Now that trump is known, compute per-player trump length.
    for (const [pid, hand] of Object.entries(rec.initialHands || {})) {
        if (rec.handMetrics[pid]) {
            rec.handMetrics[pid].trumpLength = hand.filter((c) => c.suit === trumpSuit).length;
        }
    }

    rec.lastEventAt = now;
    return gameState;
}

/**
 * Record partner card selection and resolve which players actually hold
 * each partner card (so later analysis can score "partner luck").
 */
function recordPartnerSelection(gameState, partnerCards) {
    const rec = gameState?.recording;
    if (!rec || !rec.powerhouse) return gameState;
    const now = Date.now();

    const owners = [];
    for (const pc of partnerCards || []) {
        const match = [];
        for (const [pid, hand] of Object.entries(rec.initialHands)) {
            if (pid === rec.bidding.bidWinner) continue; // skip leader
            const copies = (hand || []).filter((c) => cardsMatch(c, pc.card)).length;
            for (let i = 0; i < copies; i += 1) match.push(pid);
        }
        owners.push(match);
    }

    rec.powerhouse.partnerCards = (partnerCards || []).map((pc) => ({
        card: { ...pc.card },
        whichCopy: pc.whichCopy ?? null,
    }));
    rec.powerhouse.partnerSelectionTimeMs = now - rec.lastEventAt;
    rec.powerhouse.partnerCardOwners = owners;
    rec.lastEventAt = now;
    return gameState;
}

// ── Play phase ─────────────────────────────────────────────────────────────

/**
 * Compute the current winning card/player among plays made so far in a trick.
 * Mirrors the engine's resolveTrick logic without mutating state.
 */
function computeCurrentTrickLeader(plays, trumpSuit) {
    if (!plays || plays.length === 0) return { card: null, playerId: null };
    const ledSuit = plays[0].card.suit;
    const trumpPlays = plays.filter((p) => p.card.suit === trumpSuit);
    const group = (trumpPlays.length > 0 && trumpSuit !== ledSuit)
        ? trumpPlays
        : plays.filter((p) => p.card.suit === ledSuit);
    if (group.length === 0) return { card: null, playerId: null };

    let winner = group[0];
    for (let i = 1; i < group.length; i += 1) {
        const p = group[i];
        if (cardsMatch(p.card, winner.card)) {
            winner = p; // duplicate rule: later copy wins
        } else if (compareRanks(p.card.rank, winner.card.rank) > 0) {
            winner = p;
        }
    }
    return { card: { ...winner.card }, playerId: winner.playerId };
}

/**
 * Record a play BEFORE the engine applies it (so we can capture hand state
 * and valid alternatives).
 * @param {object} gameState   Current state (before engine mutation).
 * @param {string} playerId
 * @param {object} card
 * @param {Array}  validPlays  From tricks.getValidPlays(gameState, playerId).
 */
function recordPlay(gameState, playerId, card, validPlays) {
    const rec = gameState?.recording;
    if (!rec) return gameState;
    const now = Date.now();

    const isJudgement = gameState.game_type === "judgement";
    const trumpSuit = isJudgement ? gameState.trumpSuit : gameState.powerHouseSuit;
    const trick = gameState.currentTrick;
    const hand = gameState.hands?.[playerId] || [];

    const currentLeader = computeCurrentTrickLeader(trick?.plays || [], trumpSuit);

    // Kaliteri-only team context at decision time
    let currentLeaderIsPartner = null;
    let teamBeforePlay = null;
    let revealedPartnersBefore = null;
    let unrevealedPartnerCards = null;
    if (!isJudgement) {
        const bidTeam = gameState.teams?.bid || [];
        if (currentLeader.playerId) {
            currentLeaderIsPartner = bidTeam.includes(currentLeader.playerId);
        }
        teamBeforePlay = {
            bid: [...bidTeam],
            oppose: [...(gameState.teams?.oppose || [])],
        };
        revealedPartnersBefore = [...(gameState.revealedPartners || [])];
        // Partner cards still in play (not yet revealed) — suits/ranks only.
        unrevealedPartnerCards = (gameState.partnerCards || [])
            .filter((pc) => !pc.revealed)
            .map((pc) => ({ suit: pc.card.suit, rank: pc.card.rank, whichCopy: pc.whichCopy }));
    }

    // Does this play trigger a partner reveal? (best-effort prediction)
    let triggersPartnerReveal = false;
    if (!isJudgement && playerId !== gameState.leader) {
        triggersPartnerReveal = (gameState.partnerCards || []).some(
            (pc) => !pc.revealed && cardsMatch(pc.card, card)
        );
    }

    // Find or create the trick entry for the current in-progress trick.
    let trickEntry = rec.tricks[rec.tricks.length - 1];
    const isNewTrick = !trickEntry || trickEntry.completed;
    if (isNewTrick) {
        trickEntry = {
            trickNumber: gameState.currentRound,
            // Leader of this trick (seat order at turnIndex when trick started)
            trickStarter: gameState.roundLeader || (trick?.plays?.[0]?.playerId ?? null) || playerId,
            ledSuitAtStart: null,
            trumpSuit,
            plays: [],
            winner: null,
            winningCard: null,
            points: 0,
            completed: false,
        };
        rec.tricks.push(trickEntry);
    }

    if (trickEntry.plays.length === 0) {
        // The player leading this trick sets the led suit with their card.
        trickEntry.ledSuitAtStart = card.suit;
    }

    trickEntry.plays.push({
        order: trickEntry.plays.length,
        playerId,
        card: { ...card },
        timestamp: now,
        timeToPlayMs: now - rec.lastEventAt,
        wasForced: Array.isArray(validPlays) && validPlays.length === 1,
        validPlayCount: Array.isArray(validPlays) ? validPlays.length : null,
        validPlays: (validPlays || []).map((c) => ({ ...c })),
        handSizeBefore: hand.length,
        handBefore: hand.map((c) => ({ ...c })),
        // Trick context at moment of play
        currentLeaderCardBefore: currentLeader.card,
        currentLeaderPlayerBefore: currentLeader.playerId,
        currentLeaderIsPartnerBefore: currentLeaderIsPartner,
        // Kaliteri team/partner context
        teamBeforePlay,
        revealedPartnersBefore,
        unrevealedPartnerCardsBefore: unrevealedPartnerCards,
        triggersPartnerReveal,
    });

    rec.lastEventAt = now;
    return gameState;
}

/**
 * Record trick completion. Called after the engine finishes a trick.
 * `completedTrick` is the object the engine appended to gameState.tricks.
 */
function recordTrickComplete(gameState, completedTrick) {
    const rec = gameState?.recording;
    if (!rec) return gameState;
    const trickEntry = rec.tricks[rec.tricks.length - 1];
    if (!trickEntry || trickEntry.completed) return gameState;

    trickEntry.winner = completedTrick.winner;
    trickEntry.points = completedTrick.points || 0;
    const winningPlay = (completedTrick.cards || []).find(
        (c) => c.playerId === completedTrick.winner
    );
    trickEntry.winningCard = winningPlay ? { ...winningPlay.card } : null;
    trickEntry.completed = true;

    // Mark any partner reveals that actually landed on this trick
    if (gameState.game_type !== "judgement") {
        const revealedNow = gameState.revealedPartners || [];
        trickEntry.partnersRevealedByThisTrick = trickEntry.plays
            .filter((p) => p.triggersPartnerReveal && revealedNow.includes(p.playerId))
            .map((p) => p.playerId);
    }

    return gameState;
}

// ── Results ────────────────────────────────────────────────────────────────

/** Finalize a Kaliteri record with the scoring result. */
function finalizeKaliteriResult(gameState, scoringResult) {
    const rec = gameState?.recording;
    if (!rec) return gameState;

    const tricksWonByPlayer = {};
    for (const pid of gameState.seatOrder || []) tricksWonByPlayer[pid] = 0;
    for (const t of gameState.tricks || []) {
        if (!t.winner) continue;
        tricksWonByPlayer[t.winner] = (tricksWonByPlayer[t.winner] || 0) + 1;
    }

    // Per-player points captured (sum of points from tricks they personally won)
    const pointsCapturedByPlayer = {};
    for (const pid of gameState.seatOrder || []) pointsCapturedByPlayer[pid] = 0;
    for (const t of gameState.tricks || []) {
        if (!t.winner) continue;
        pointsCapturedByPlayer[t.winner] =
            (pointsCapturedByPlayer[t.winner] || 0) + (t.points || 0);
    }

    rec.result = {
        bidTeamPoints: scoringResult.bidTeamPoints,
        opposeTeamPoints: scoringResult.opposeTeamPoints,
        bidAmount: scoringResult.bidAmount,
        bidTeamSuccess: scoringResult.bidTeamSuccess,
        teams: {
            bid: [...(gameState.teams?.bid || [])],
            oppose: [...(gameState.teams?.oppose || [])],
        },
        revealedPartners: [...(gameState.revealedPartners || [])],
        tricksWonByPlayer,
        pointsCapturedByPlayer,
        playerDeltas: { ...scoringResult.playerDeltas },
        cumulativeScoresAfter: { ...(gameState.scores || {}) },
    };

    rec.endedAt = Date.now();
    rec.durationMs = rec.endedAt - rec.startedAt;
    return gameState;
}

/** Finalize a Judgement record with the round result. */
function finalizeJudgementResult(gameState, roundEntry) {
    const rec = gameState?.recording;
    if (!rec) return gameState;

    const bids = roundEntry?.bids || {};
    const tricksWon = roundEntry?.tricksWon || {};
    const bidVsActual = {};
    for (const pid of gameState.seatOrder || []) {
        const bid = bids[pid] ?? 0;
        const actual = tricksWon[pid] ?? 0;
        bidVsActual[pid] = {
            bid,
            actual,
            exact: bid === actual,
            delta: actual - bid,
        };
    }

    rec.result = {
        trumpSuit: roundEntry?.trumpSuit || null,
        trumpCard: roundEntry?.trumpCard || null,
        bids,
        tricksWon,
        bidVsActual,
        deltas: { ...(roundEntry?.deltas || {}) },
        cumulativeScoresAfter: { ...(roundEntry?.cumulative || {}) },
    };

    rec.endedAt = Date.now();
    rec.durationMs = rec.endedAt - rec.startedAt;
    return gameState;
}

/**
 * Persist the current recording to MongoDB as a GameRecord document.
 * Returns the created document id, or null on failure.
 * @param {object} gameState
 * @param {object} [opts]
 * @param {"completed"|"abandoned"} [opts.status="completed"]
 * @param {string} [opts.abandonReason]
 */
async function persistRecording(gameState, opts = {}) {
    const rec = gameState?.recording;
    if (!rec) return null;
    const status = opts.status || "completed";

    // Guard: don't create a useless record for an abandoned deal that never
    // got past the deal (no bids placed, no tricks played, no result). The
    // hand metrics alone aren't worth a document for every lobby timeout.
    if (status === "abandoned") {
        const hasAnyBid =
            (rec.bidding?.bidEvents?.length || 0) > 0 ||
            Object.keys(rec.bidding?.judgementBids || {}).length > 0;
        const hasAnyTrick = (rec.tricks?.length || 0) > 0;
        if (!hasAnyBid && !hasAnyTrick) return null;
    }

    try {
        // Lazy-require to avoid any model-load ordering issues.
        const GameRecord = require("../models/GameRecord");
        const doc = await GameRecord.create({
            gameId: gameState.gameId,
            roomname: gameState.roomname,
            gameType: rec.gameType,
            currentGameNumber: rec.currentGameNumber,
            totalGames: rec.totalGames,
            seriesRoundIndex: rec.seriesRoundIndex,
            totalRoundsInSeries: rec.totalRoundsInSeries,
            config: rec.config,
            seatOrder: rec.seatOrder,
            playerNames: rec.playerNames,
            dealer: rec.dealer,
            dealerIndex: rec.dealerIndex,
            removedTwos: rec.removedTwos,
            initialHands: rec.initialHands,
            handMetrics: rec.handMetrics,
            totalPointsInDeck: rec.totalPointsInDeck,
            bidding: rec.bidding,
            powerhouse: rec.powerhouse,
            tricks: rec.tricks,
            result: rec.result,
            status,
            abandonReason: opts.abandonReason || null,
            abandonedAtPhase: status === "abandoned" ? (gameState.phase || null) : null,
            startedAt: new Date(rec.startedAt),
            endedAt: rec.endedAt ? new Date(rec.endedAt) : (status === "abandoned" ? new Date() : null),
            durationMs: rec.durationMs || (status === "abandoned" ? Date.now() - rec.startedAt : null),
        });
        return doc._id;
    } catch (err) {
        // Recording is best-effort — never let a persist failure break gameplay.
        console.error("Failed to persist game record:", err.message);
        return null;
    }
}

module.exports = {
    initRecording,
    computeHandMetrics,
    recordKaliteriBidEvent,
    recordKaliteriBiddingComplete,
    recordJudgementBid,
    recordTrumpSelection,
    recordPartnerSelection,
    recordPlay,
    recordTrickComplete,
    finalizeKaliteriResult,
    finalizeJudgementResult,
    persistRecording,
};
