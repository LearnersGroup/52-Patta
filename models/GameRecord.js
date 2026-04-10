const mongoose = require("mongoose");

/**
 * GameRecord — one document per completed deal.
 *
 * For Kaliteri: one record per game (one deal, one bid, one play cycle, one score).
 * For Judgement: one record per round (each round is a self-contained deal/bid/play).
 *
 * This is a write-once, analytics-friendly snapshot. Designed as the source of
 * truth for training skill-based scoring systems, calibrating Hand Quality
 * Indices, and post-game retrospection for players.
 *
 * Nested structures use Mixed to stay flexible; indexes are on the fields we
 * actually query (gameId, playerIds, createdAt, gameType).
 */
const GameRecordSchema = new mongoose.Schema({
    // ── Linkage ────────────────────────────────────────────────────────────
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "game",
        required: true,
        index: true,
    },
    roomname: {
        type: String,
        required: true,
    },
    gameType: {
        type: String,
        enum: ["kaliteri", "judgement"],
        required: true,
        index: true,
    },

    // Series position for grouping records from the same room session
    currentGameNumber: Number,      // kaliteri: game number within series
    totalGames: Number,             // kaliteri: total games in series
    seriesRoundIndex: Number,       // judgement: round index within series
    totalRoundsInSeries: Number,    // judgement

    // ── Config snapshot ───────────────────────────────────────────────────
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },

    // ── Players ───────────────────────────────────────────────────────────
    seatOrder: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
        index: true,
    },
    playerNames: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    dealer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },
    dealerIndex: Number,

    // ── Deal snapshot ─────────────────────────────────────────────────────
    removedTwos: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },
    initialHands: {
        // { [playerId]: [{ suit, rank, deckIndex }] }
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    handMetrics: {
        // { [playerId]: { pointCardValue, handQualityIndex, suitCounts,
        //                 voidCount, highCardCount, hasKaliTiri, fiveCount,
        //                 trumpLength } }
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    totalPointsInDeck: Number,

    // ── Bidding phase ─────────────────────────────────────────────────────
    bidding: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },

    // ── Kaliteri powerhouse phase ─────────────────────────────────────────
    powerhouse: {
        // { trumpSuit, trumpSelectionTimeMs, partnerCards, partnerSelectionTimeMs,
        //   partnerCardOwners }
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },

    // ── Play phase ────────────────────────────────────────────────────────
    tricks: {
        // Array of trick entries. See recording.js for shape.
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },

    // ── Results ───────────────────────────────────────────────────────────
    result: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },

    // ── Completion status ─────────────────────────────────────────────────
    // "completed" — the deal finished normally (default, existing behaviour)
    // "abandoned" — all players disconnected or stale eviction kicked in before
    //               the deal finished. tricks/result may be partial or empty.
    status: {
        type: String,
        enum: ["completed", "abandoned"],
        default: "completed",
        index: true,
    },
    abandonReason: {
        type: String,   // "all-disconnected" | "stale-eviction" | null
        default: null,
    },
    abandonedAtPhase: {
        type: String,   // phase at time of abandonment (e.g. "playing")
        default: null,
    },

    // ── Player feedback (optional, filled post-game) ──────────────────────
    feedback: {
        type: [{
            playerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user",
            },
            enjoymentRating: Number,       // 1-5
            difficultyRating: Number,      // 1-5
            playedWellSelfRating: Number,  // 1-5 self-assessment
            handFeltFair: Boolean,         // did cards feel fair
            comment: String,
            submittedAt: Date,
        }],
        default: [],
    },

    // ── Timing ────────────────────────────────────────────────────────────
    startedAt: Date,
    endedAt: Date,
    durationMs: Number,
}, {
    timestamps: true,
});

// Compound index for per-player game history queries
GameRecordSchema.index({ "seatOrder": 1, createdAt: -1 });
GameRecordSchema.index({ gameType: 1, createdAt: -1 });

module.exports = mongoose.model("gameRecord", GameRecordSchema);
