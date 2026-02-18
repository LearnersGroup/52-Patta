const Game = require("../../models/Game");
const User = require("../../models/User");

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
                player.ready = !player.ready;
            }
            return player;
        });

        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );

        io.to(game.roomname).emit("fetch-users-in-room");

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Toggle ready error");
    }
};
