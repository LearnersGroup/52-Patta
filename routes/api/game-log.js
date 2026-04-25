const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../../middleware/auth");
const Game = require("../../models/Game");
const GameLog = require("../../models/GameLog");

// @route   GET /api/game-log/me
// @desc    Get paginated series log for the authenticated user (newest first)
// @access  Private
router.get("/me", [auth], async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const cursor = req.query.cursor; // last finishedAt ISO string for pagination

        const query = {
            kind: "series",
            "players.userId": req.user.id,
        };
        if (cursor) {
            query.finishedAt = { $lt: new Date(cursor) };
        }

        const series = await GameLog.find(query)
            .sort({ finishedAt: -1 })
            .limit(limit)
            .lean();

        // For each series, attach its per-game rows
        const seriesIds = series.map((s) => s.seriesId);
        const games = await GameLog.find({
            kind: "game",
            seriesId: { $in: seriesIds },
        })
            .sort({ gameNumber: 1 })
            .lean();

        const gamesBySeries = {};
        for (const g of games) {
            const key = g.seriesId.toString();
            if (!gamesBySeries[key]) gamesBySeries[key] = [];
            gamesBySeries[key].push(g);
        }

        const result = series.map((s) => ({
            ...s,
            gameRows: gamesBySeries[s.seriesId.toString()] || [],
        }));

        const nextCursor =
            series.length === limit ? series[series.length - 1].finishedAt.toISOString() : null;

        res.json({ series: result, nextCursor });
    } catch (error) {
        console.error("GET /api/game-log/me error:", error.message);
        res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
});

// @route   GET /api/game-log/me/:seriesId
// @desc    Get a single series row with all its per-game rows
// @access  Private
router.get("/me/:seriesId", [auth], async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.seriesId)) {
            return res.status(400).json({ errors: [{ msg: "Invalid seriesId" }] });
        }

        const seriesRow = await GameLog.findOne({
            kind: "series",
            seriesId: req.params.seriesId,
            "players.userId": req.user.id,
        }).lean();

        if (!seriesRow) {
            return res.status(404).json({ errors: [{ msg: "Series not found" }] });
        }

        const gameRows = await GameLog.find({
            kind: "game",
            seriesId: req.params.seriesId,
        })
            .sort({ gameNumber: 1 })
            .lean();

        res.json({ series: seriesRow, gameRows });
    } catch (error) {
        console.error("GET /api/game-log/me/:seriesId error:", error.message);
        res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
});

// @route   GET /api/game-log/room/:roomId
// @desc    Get per-game log for a room (players of that room only)
// @access  Private
router.get("/room/:roomId", [auth], async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.roomId)) {
            return res.status(400).json({ errors: [{ msg: "Invalid roomId" }] });
        }

        // Verify requester is in this room
        const game = await Game.findById(req.params.roomId)
            .select("players admin")
            .lean();
        if (!game) {
            return res.status(404).json({ errors: [{ msg: "Room not found" }] });
        }

        const isMember =
            game.admin?.toString() === req.user.id ||
            game.players?.some((p) => p.playerId?.toString() === req.user.id);
        if (!isMember) {
            return res.status(403).json({ errors: [{ msg: "Not a member of this room" }] });
        }

        const logs = await GameLog.find({
            kind: "game",
            roomId: req.params.roomId,
        })
            .sort({ finishedAt: 1 })
            .lean();

        res.json({ logs });
    } catch (error) {
        console.error("GET /api/game-log/room/:roomId error:", error.message);
        res.status(500).json({ errors: [{ msg: "Server error" }] });
    }
});

module.exports = router;
