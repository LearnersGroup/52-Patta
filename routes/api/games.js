const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Game = require("../../models/Game");
const auth = require("../../middleware/auth");

// @route   POST api/games
// @desc    Register gameroom
// @access  Private                                          // if token required then, Private
router.post(
    "/",
    [
        auth,
        [
            check("roomname", "Room name is required").not().isEmpty().trim().escape().isLength({ max: 50 }),
            check("player_count", "Player count is required").isInt({ min: 2, max: 10 }),
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

        const { roomname, roompass, player_count } = req.body;

        try {
            //check if player already in room
            let player = await User.findOne({ _id: req.user.id});
            if( player['gameroom'] !== null && typeof(player['gameroom']) === "object"){
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Player Already in a room" }] });
            }

            //check if game exists
            let game = await Game.findOne({ roomname: roomname });

            if (game) {
                return res
                    .status(400)
                    .json({ errors: [{ msg: "Gameroom Already exists" }] });
            }

            game = new Game({
                roomname: roomname,
                roompass: roompass,
                player_count: player_count,
                players: [{ playerId: req.user.id }],
                admin: req.user.id,
            });

            //encrypt creds & store
            const salt = await bcrypt.genSalt(10);
            game.roompass = await bcrypt.hash(roompass, salt);
            game = await game.save();
            player = await User.findOneAndUpdate(
                { _id: req.user.id },
                { gameroom: game.id }
            );

            return res.status(200).json({ room_id: game.id });
        } catch (error) {
            res.status(500).send("server error");
        }
    }
);

module.exports = router;
