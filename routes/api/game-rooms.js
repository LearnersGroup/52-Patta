const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Game = require("../../models/Game");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");

// @route   GET api/game-room/
// @desc    Get all active game rooms
// @access  Private                                          // if token required then, Private
router.get("/", auth, async (req, res) => {
    try {
        const games = await Game.find()
            .populate("admin", ["name"])
            .populate("players", ["name"])
            .select("-roompass");

        if (!games) {
            return res
                .status(200)
                .json({ msg: "There are no live game rooms" });
        }

        res.json(games);
    } catch (error) {
        console.error(error.message);
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
            check("roomname", "Room name is required").not().isEmpty(),
            check(
                "roompass",
                "Please enter a password with 6 or more characters"
            ).isLength({ min: 6 }),
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
            const playerInRoom = game.players.includes(req.user.id);
            if (playerInRoom) {
                return res.status(200).json("Player Already in room");
            }

            //check if player already in room
            let player = await User.findOne({ _id: req.user.id});
            if( player['gameroom'] !== null && typeof(player['gameroom']) === "object"){
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Player Already in a room" }] });
            }

            //Check if room full
            if (game.players.length >= game.player_count) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Room is full" }] });
            }

            //verify credentials
            const isMatch = await bcrypt.compare(roompass, game.roompass);

            if (!isMatch) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Invalid Credentials" }] });
            }

            //Update game room
            let gameroom = await Game.findOneAndUpdate(
                { _id: game.id },
                { players: [...game.players, req.user.id] }
            );
            //Update user game-room
            await User.findOneAndUpdate(
                { _id: req.user.id },
                { gameroom: gameroom.id }
            );

            return res.status(200).json("Player added in the room");
        } catch (error) {
            console.error(error.message);
            res.status(500).send("server error");
        }
    }
);

module.exports = router;
