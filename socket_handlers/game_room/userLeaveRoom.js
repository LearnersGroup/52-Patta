const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

module.exports = (socket, io) => async (data, callback) => {
    const { roomname, roompass } = data;

    try {
        //find the game room
        let user = await User.findOne({ _id: socket.user.id });
        let game = await Game.findById(user.gameroom)
            .populate("admin", ["name"])
            .populate("players", ["name"]);

        if (!game) {
            callback("Room does not exists");
            return;
        }

        //remove gameroom of the user
        await User.findOneAndUpdate({ _id: socket.user.id }, [
            { $unset: ["gameroom"] },
        ]);

        //if user is admin close the game room
        console.log("is admin ", game.admin.id === socket.user.id);
        if (game.admin.id === socket.user.id) {
            game.players.map(
                async (player) =>
                    await User.findOneAndUpdate({ _id: player.id }, [
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
            (player) => player.id != socket.user.id
        );
        console.log(updatedPlayers);

        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );
        
        await socket.leave(roomname);
        socket.emit("redirect-to-game-room", game.id, (res) => {
            if (res.status === 200) {
                io.to(roomname).emit(
                    "room-message",
                    `${socket.username} has joined!`
                );
                io.to(roomname).emit("fetch-users-in-room");
            }
        });
    } catch (error) {
        callback(error);
        console.error(error.message);
    }
};
