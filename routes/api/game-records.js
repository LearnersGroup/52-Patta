const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const auth = require("../../middleware/auth");
const GameRecord = require("../../models/GameRecord");

/**
 * @route   GET /api/game-records/mine
 * @desc    List the authenticated user's recent game records (metadata only).
 * @access  Private
 */
router.get("/mine", [auth], async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const records = await GameRecord.find(
            { seatOrder: req.user.id },
            {
                gameType: 1,
                roomname: 1,
                currentGameNumber: 1,
                totalGames: 1,
                seriesRoundIndex: 1,
                totalRoundsInSeries: 1,
                dealer: 1,
                playerNames: 1,
                seatOrder: 1,
                "result.bidTeamSuccess": 1,
                "result.bidAmount": 1,
                "result.bidTeamPoints": 1,
                "result.opposeTeamPoints": 1,
                "result.bidVsActual": 1,
                "result.cumulativeScoresAfter": 1,
                startedAt: 1,
                endedAt: 1,
                durationMs: 1,
                createdAt: 1,
            }
        )
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        res.json(records);
    } catch (err) {
        console.error("List my records error:", err.message);
        res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
});

/**
 * @route   GET /api/game-records/:id
 * @desc    Fetch a single game record in full. Only participants may view it.
 * @access  Private
 */
router.get("/:id", [auth], async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ errors: [{ msg: "Invalid record id" }] });
        }
        const record = await GameRecord.findById(req.params.id).lean();
        if (!record) {
            return res.status(404).json({ errors: [{ msg: "Record not found" }] });
        }
        const isParticipant = (record.seatOrder || []).some(
            (pid) => pid?.toString() === req.user.id
        );
        if (!isParticipant) {
            return res.status(403).json({ errors: [{ msg: "Not a participant in this game" }] });
        }
        res.json(record);
    } catch (err) {
        console.error("Get record error:", err.message);
        res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
});

/**
 * @route   POST /api/game-records/:id/feedback
 * @desc    Append post-game feedback for the authenticated player.
 *          Replaces any prior feedback from the same user on the same record.
 * @access  Private
 *
 * Body: {
 *   enjoymentRating?: number (1-5),
 *   difficultyRating?: number (1-5),
 *   playedWellSelfRating?: number (1-5),
 *   handFeltFair?: boolean,
 *   comment?: string
 * }
 */
router.post("/:id/feedback", [auth], async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ errors: [{ msg: "Invalid record id" }] });
        }

        const {
            enjoymentRating,
            difficultyRating,
            playedWellSelfRating,
            handFeltFair,
            comment,
        } = req.body || {};

        // Basic bounds check on ratings so analytics isn't contaminated.
        const inRange = (v) => v === undefined || v === null ||
            (Number.isFinite(v) && v >= 1 && v <= 5);
        if (!inRange(enjoymentRating) || !inRange(difficultyRating) || !inRange(playedWellSelfRating)) {
            return res.status(400).json({ errors: [{ msg: "Ratings must be between 1 and 5" }] });
        }
        if (comment && typeof comment !== "string") {
            return res.status(400).json({ errors: [{ msg: "Comment must be a string" }] });
        }
        if (comment && comment.length > 1000) {
            return res.status(400).json({ errors: [{ msg: "Comment too long (max 1000 chars)" }] });
        }

        const record = await GameRecord.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ errors: [{ msg: "Record not found" }] });
        }

        const isParticipant = (record.seatOrder || []).some(
            (pid) => pid?.toString() === req.user.id
        );
        if (!isParticipant) {
            return res.status(403).json({ errors: [{ msg: "Not a participant in this game" }] });
        }

        // Remove any existing feedback from this user, then push fresh entry.
        record.feedback = (record.feedback || []).filter(
            (f) => f.playerId?.toString() !== req.user.id
        );
        record.feedback.push({
            playerId: req.user.id,
            enjoymentRating: enjoymentRating ?? null,
            difficultyRating: difficultyRating ?? null,
            playedWellSelfRating: playedWellSelfRating ?? null,
            handFeltFair: handFeltFair ?? null,
            comment: comment || null,
            submittedAt: new Date(),
        });
        await record.save();

        res.json({ ok: true });
    } catch (err) {
        console.error("Submit feedback error:", err.message);
        res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
});

module.exports = router;
