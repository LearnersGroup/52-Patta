const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

module.exports = (socket, io) => async (data, callback) => {
    const { roomname, roompass } = data;

    try {
        let game = await Game.findOne({ roomname: roomname });

        if (!game) {
            callback("Room does not exists");
            return;
        }

        //verify player not already in the room
        const playerInRoom = game.players.includes(socket.user.id);
        if (playerInRoom) {
            await socket.join(roomname);
            socket.emit("redirect-to-game-room", game.id, (res) => {
                if (res.status === 200) {
                    io.to(roomname).emit(
                        "room-message",
                        `${socket.username} created ${roomname}!`
                    );
                    io.to(roomname).emit("fetch-users-in-room");
                }
            });
            io.to(roomname).emit(
                "room-message",
                `${socket.username} has joined!`
            );
            io.to(roomname).emit("fetch-users-in-room");
            return;
        }

        //check if player already in room
        let player = await User.findOne({ _id: socket.user.id });
        if (
            player["gameroom"] !== null &&
            typeof player["gameroom"] === "object"
        ) {
            callback("Player Already in a room");
            return;
        }

        //Check if room full
        if (game.players.length >= game.player_count) {
            callback("Room is full");
            return;
        }

        //verify credentials
        const isMatch = await bcrypt.compare(roompass, game.roompass);

        if (!isMatch) {
            callback("Invalid Credentials");
            return;
        }

        //Update game room
        let gameroom = await Game.findOneAndUpdate(
            { _id: game.id },
            { players: [...game.players, socket.user.id] }
        );
        //Update user game-room
        await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: gameroom.id }
        );
        await socket.join(roomname);
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
