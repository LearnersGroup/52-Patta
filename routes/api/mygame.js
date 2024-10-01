const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Game = require("../../models/Game");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");

// @route   GET api/mygame/
// @desc    Get users game
// @access  Private                                          // if token required then, Private
router.get("/", [auth], async (req, res) => {
    try {
        //find the game room
        let user = await User.findOne({ _id: req.user.id }).populate(
            "gameroom",
            ["roomname"]
        );

        if (!user?.gameroom) {
            return res.status(200).json({ msg: "User not in any game-room" });
        }
        res.json(user.gameroom);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   DELETE api/mygame/
// @desc    Leave the gameroom
// @access  Private                                          // if token required then, Private
router.delete("/", [auth], async (req, res) => {
    try {
        //find the game room
        let user = await User.findOne({ _id: req.user.id });
        let game = await Game.findById(user.gameroom)
            .populate("admin", ["name"])
            .populate("players.playerId", ["name"]);

        if (!game) {
            return res.status(200).json({ msg: "Not in a game room" });
        }

        //remove gameroom of the user
        await User.findOneAndUpdate({ _id: req.user.id }, [
            { $unset: ["gameroom"] },
        ]);

        //if user is admin close the game room
        console.log("is admin ", game.admin.id === req.user.id);
        if (game.admin.id === req.user.id) {
            game.players.map(
                async (player) =>
                    await User.findOneAndUpdate({ _id: player.playerId.id }, [
                        { $unset: ["gameroom"] },
                    ])
            );
            await Game.findOneAndDelete({ _id: game.id });
            return res
                .status(200)
                .json({ msg: "Removed Admin & deleted room" });
        }

        //remove the user from players list
        const updatedPlayers = game.players.filter(
            (player) => player.playerId.id != req.user.id
        );
        console.log(updatedPlayers);

        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );

        return res.status(200).json({ msg: "Removed player from the room" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
