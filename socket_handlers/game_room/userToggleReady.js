const c = require("config");
const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

module.exports = (socket, io) => async (callback) => {
    try {
        let user = await User.findOne({ _id: socket.user.id });
        let game = await Game.findById(user.gameroom)
        .populate("admin", ["name"])
        .populate("players.playerId", ["name"]);
        
        if (!game) {
            callback("Room does not exists");
            return;
        }
        
        const updatedPlayers = game.players.map((player) => {
            if (player.playerId.id === socket.user.id) {
                console.log("player ready status toggled");
                player.ready = !player.ready; // Toggle the ready status
            }
            return player;
        });
        
        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );
        
        io.to(game.roomname).emit("fetch-users-in-room");
        
    } catch (error) {
        callback(error);
        console.error(error.message);
    }
};