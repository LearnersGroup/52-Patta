const Game = require("../../models/Game");
const User = require("../../models/User");

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
        if (game.admin.id === socket.user.id) {
            for (const player of game.players) {
                await User.findOneAndUpdate({ _id: player.playerId.id }, [
                    { $unset: ["gameroom"] },
                ]);
            }
            await Game.findOneAndDelete({ _id: game.id });
            //redirecting all users to homePage
            const socketsInRoom = await io.in(game.roomname).fetchSockets();
            console.log(`[LeaveRoom] Admin leaving room "${game.roomname}". Sockets in room: ${socketsInRoom.length}, ids: [${socketsInRoom.map(s => s.user?.id).join(', ')}]`);
            io.to(game.roomname).emit("redirect-to-home-page");
            return;
        }

        //remove the user from players list
        const updatedPlayers = game.players.filter(
            (player) => player.playerId.id != socket.user.id
        );

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
        if (callback) callback("An error occurred");
        console.error("Leave room error");
    }
};
