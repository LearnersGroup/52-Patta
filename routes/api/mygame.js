const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const gameauth = require("../../middleware/game-auth");
const Game = require("../../models/Game");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");

// @route   GET api/mygame/
// @desc    Get users game
// @access  Private                                          // if token required then, Private
router.get("/", [auth, gameauth], async (req, res) => {
    try {
        //find the game room
        const game = await Game.findById(req.game.id)
            .populate("admin", ["name"])
            .populate("players", ["name"]);

        if(!game) {
            return res
                .status(200)
                .json({ msg: "Game room closed" });
        }
        res.json(game);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

// @route   DELETE api/mygame/
// @desc    Leave the gameroom
// @access  Private                                          // if token required then, Private
router.delete("/", [auth, gameauth], async (req, res) => {
    try {
        //find the game room
        let game = await Game.findById(req.game.id)
            .populate("admin", ["name"])
            .populate("players", ["name"]);

        if(!game) {
            return res
                .status(200)
                .json({ msg: "Not in a game room" });
        }

        //if user is admin close the game room
        if(game.admin.id === req.user.id){
            console.log("is admin")
            await Game.findOneAndDelete({gameroom: req.game.gameroom});
            console.log("game room deleted")
            const payload = {
                user: {
                    id: req.user.id,
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

        //remove the user from players list
        const updatedPlayers = game.players.filter((player)=> player.id != req.user.id);
        console.log(updatedPlayers);

        game = await Game.findOneAndUpdate(
            { roomname: game.roomname },
            { players: updatedPlayers }
        );
        

        // return updated jwt
        const payload = {
            user: {
                id: req.user.id,
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
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
