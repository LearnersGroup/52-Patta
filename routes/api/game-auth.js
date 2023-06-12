const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Game = require("../../models/Game");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");

// @route   GET api/game-auth/
// @desc    Get active game rooms
// @access  Private                                          // if token required then, Private
router.get("/", auth, async (req, res) => {
    try {
        const games = await Game.find()
            .populate("admin", ["name"])
            .populate("players", ["name"]);

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

// @route   POST api/game-auth/
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

            //verify credentials
            const isMatch = await bcrypt.compare(roompass, game.roompass);

            if (!isMatch) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Invalid Credentials" }] });
            }

            //verify player not already in the room
            const playerInRoom = game.players.includes(req.user.id);
            console.log(playerInRoom)
            if (playerInRoom) {
                const payload = {
                    user: {
                        id: req.user.id,
                    },
                    game: {
                        id: game.id,
                    },
                };

                return jwt.sign(
                    payload,
                    config.get("jwtSecret"),
                    { expiresIn: 360000 },
                    (err, token) => {
                        if (err) throw err;
                        res.json({ token });
                    }
                );
            }

            //add user to players list
            if (game.players.length >= game.player_count) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Room is full" }] });
            }

            const updatedPlayers = [...game.players, req.user.id];
            game = await Game.findOneAndUpdate(
                { roomname: roomname },
                { players: updatedPlayers }
            );

            // return updated jwt
            const payload = {
                user: {
                    id: req.user.id,
                },
                game: {
                    id: game.id,
                },
            };

            jwt.sign(
                payload,
                config.get("jwtSecret"),
                { expiresIn: 360000 },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        } catch (error) {
            console.error(error.message);
            res.status(500).send("server error");
        }
    }
);

module.exports = router;
