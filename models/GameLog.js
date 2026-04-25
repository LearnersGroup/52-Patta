const mongoose = require("mongoose");

const GameLogSchema = new mongoose.Schema(
    {
        kind: {
            type: String,
            enum: ["game", "series"],
            required: true,
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "game",
            required: true,
            index: true,
        },
        roomCode: { type: String },
        gameType: {
            type: String,
            enum: ["kaliteri", "judgement", "mendikot"],
            required: true,
        },
        // Shared identifier across all 'game' rows in one series + its 'series' row
        seriesId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        gameNumber: { type: Number }, // kind='game' only
        players: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
                name: { type: String },
                avatar: { type: String },
            },
        ],
        // Per-game fields
        scoringResult: { type: mongoose.Schema.Types.Mixed },
        playerDeltas: { type: mongoose.Schema.Types.Mixed },
        bidTeamSuccess: { type: Boolean },
        // Per-series fields
        finalRankings: [
            {
                playerId: { type: String },
                name: { type: String },
                score: { type: Number },
                rank: { type: Number },
            },
        ],
        winnerUserId: { type: String },
        // Common
        startedAt: { type: Date },
        finishedAt: { type: Date, default: Date.now },
        durationMs: { type: Number },
    },
    { timestamps: true }
);

GameLogSchema.index({ "players.userId": 1, finishedAt: -1 });
GameLogSchema.index({ roomId: 1, finishedAt: 1 });

module.exports = mongoose.model("gamelog", GameLogSchema);
