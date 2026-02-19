const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const { check, validationResult } = require("express-validator");

// @route   GET api/game-room/
// @desc    Get all active game rooms
// @access  Private                                          // if token required then, Private
router.get("/", auth, async (req, res) => {
    try {
        const games = await Game.find()
            .populate("admin", ["name", "_id"])
            .select("-roompass");

        if (!games) {
            return res
                .status(200)
                .json({ msg: "There are no live game rooms" });
        }

        res.json(games);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   GET api/game-room/players
// @desc    Get state of the room
// @access  Private                                          // if token required then, Private
router.get("/players", auth, async (req, res) => {
    try {
        const id = req.query.id;
        if (!id || typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ errors: [{ msg: "Valid room ID is required" }] });
        }

        let game = await Game.findOne({ _id: id })
            .populate("admin", ["name", "_id"])
            .populate("players.playerId", ["name", "_id"])
            .select("-roompass");
        if (!game) {
            return res
                .status(400)
                .json({ errors: [{ msg: "Room does not exists" }] });
        }

        res.status(200).json(game);
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// @route   POST api/game-room/
// @desc    join a game room
// @access  Private                                          // if token required then, Private
router.post(
    "/",
    [
        auth,
        [
            check("roomname", "Room name is required").not().isEmpty().trim().escape(),
            check(
                "roompass",
                "Please enter a password with 6 or more characters"
            ).isLength({ min: 6, max: 128 }),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { roomname, roompass } = req.body;

        try {
            let game = await Game.findOne({ roomname: roomname });

            if (!game) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Room does not exists" }] });
            }

            //verify player not already in the room
            const playerInRoom = game.players.some(player => player.playerId.toString() === req.user.id);
            if (playerInRoom) {
                return res.status(200).json("Player Already in room");
            }

            //check if player already in room
            let player = await User.findOne({ _id: req.user.id });
            if (
                player["gameroom"] !== null &&
                typeof player["gameroom"] === "object"
            ) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Player Already in a room" }] });
            }

            //verify credentials
            const isMatch = await bcrypt.compare(roompass, game.roompass);

            if (!isMatch) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Invalid Credentials" }] });
            }

            //Update game room atomically with capacity check
            const updatedGame = await Game.findOneAndUpdate(
                {
                    _id: game.id,
                    $expr: { $lt: [{ $size: "$players" }, "$player_count"] }
                },
                { $push: { players: { playerId: req.user.id } } },
                { new: true }
            );

            if (!updatedGame) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Room is full" }] });
            }

            //Update user game-room
            await User.findOneAndUpdate(
                { _id: req.user.id },
                { gameroom: updatedGame.id }
            );

            return res.status(200).json("Player added in the room");
        } catch (error) {
            res.status(500).send("server error");
        }
    }
);

module.exports = router;
