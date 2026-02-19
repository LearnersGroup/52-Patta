const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

module.exports = (socket, io) => async (data, callback) => {
    const { roomname, roompass, player_count } = data;

    if (!roomname || typeof roomname !== 'string') {
        callback("Room name is required");
        return;
    }
    if (!roompass || typeof roompass !== 'string' || roompass.length < 6) {
        callback("Password must be at least 6 characters");
        return;
    }
    const count = parseInt(player_count, 10);
    if (isNaN(count) || count < 2 || count > 10) {
        callback("Player count must be between 2 and 10");
        return;
    }

    // Sanitize room name
    const sanitizedRoomname = roomname.replace(/<[^>]*>/g, '').trim().slice(0, 50);

    try {
        //check if player already in room
        let player = await User.findOne({ _id: socket.user.id });
        if (
            player["gameroom"] !== null &&
            typeof player["gameroom"] === "object"
        ) {
            callback("Player Already in a room");
            return
        }
        let game = await Game.findOne({ roomname: sanitizedRoomname });
        if (game) {
            callback("Gameroom Already exists");
            return
        }

        game = new Game({
            roomname: sanitizedRoomname,
            roompass: roompass,
            player_count: count,
            players: [{playerId: socket.user.id}],
            admin: socket.user.id,
        });

        //encrypt creds & store
        const salt = await bcrypt.genSalt(10);
        game.roompass = await bcrypt.hash(roompass, salt);
        game = await game.save();
        player = await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: game.id }
        );

        await socket.join(sanitizedRoomname)
        socket.emit("redirect-to-game-room", game.id, (res) => {
            if(res.status === 200){
                io.to(sanitizedRoomname).emit("room-message", `${socket.username} created ${sanitizedRoomname}!`);
                io.to(sanitizedRoomname).emit("fetch-users-in-room");
            }
        })

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Create room error");
    }
};
