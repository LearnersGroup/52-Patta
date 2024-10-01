const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

function clearRoom(io, room, namespace = '/') {
    let roomObj = io.nsps[namespace].adapter.rooms[room];
    if (roomObj) {
        // now kick everyone out of this room
        Object.keys(roomObj.sockets).forEach(function(id) {
            io.sockets.connected[id].emit("notification", "Room Closed! Admin has left");
            io.sockets.connected[id].leave(room);
        })
    }
}

module.exports = (socket, io) => async (callback) => {
    try {
        //find the game room
        let user = await User.findOne({ _id: socket.user.id });
        let game = await Game.findById(user.gameroom)
            .populate("admin", ["name"])
            .populate("players.playerId", ["name"]);

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
                    await User.findOneAndUpdate({ _id: player.playerId.id }, [
                        { $unset: ["gameroom"] },
                    ])
            );
            await Game.findOneAndDelete({ _id: game.id });
            //redirecting all users to homePage
            io.to(game.roomname).emit("redirect-to-home-page", async (res) => {
                if (res.status === 200) {
                    clearRoom(io, game.gameroom);
                }
            });
            return;
        }

        //remove the user from players list
        const updatedPlayers = game.players.filter(
            (player) => player.playerId.id != socket.user.id
        );
        console.log(updatedPlayers);

        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );

        await socket.leave(game.roomname);
        socket.emit("redirect-to-home-page", (res) => {
            if (res.status === 200) {
                io.to(game.roomname).emit(
                    "room-message",
                    `${socket.username} has left!`
                );
                io.to(game.roomname).emit("fetch-users-in-room");
            }
        });
    } catch (error) {
        callback(error);
        console.error(error.message);
    }
};
