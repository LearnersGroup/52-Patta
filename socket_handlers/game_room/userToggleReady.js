const Game = require("../../models/Game");
const User = require("../../models/User");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('user-toggle-ready', async (socket, io, data, callback) => {
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
                player.ready = !player.ready;
            }
            return player;
        });

        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );

        io.to(game.roomname).emit("fetch-users-in-room");
});
