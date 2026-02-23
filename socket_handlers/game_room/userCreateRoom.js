const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");

module.exports = (socket, io) => async (data, callback) => {
    const { roomname, roompass, player_count, deck_count, bid_threshold } = data;

    if (!roomname || typeof roomname !== 'string') {
        callback("Room name is required");
        return;
    }
    if (!roompass || typeof roompass !== 'string' || roompass.length < 6) {
        callback("Password must be at least 6 characters");
        return;
    }
    const count = parseInt(player_count, 10);
    if (isNaN(count) || count < 4 || count > 10) {
        callback("Player count must be between 4 and 10");
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

        const gameData = {
            roomname: sanitizedRoomname,
            roompass: roompass,
            player_count: count,
            players: [{playerId: socket.user.id}],
            admin: socket.user.id,
        };
        // Only set deck_count if provided (for 6-player games where user picks 1 or 2 decks)
        if (deck_count === 1 || deck_count === 2) {
            gameData.deck_count = deck_count;
        }
        // Store bid threshold for odd-player variants
        if (bid_threshold && typeof bid_threshold === 'number' && bid_threshold > 0) {
            gameData.bid_threshold = bid_threshold;
        }
        game = new Game(gameData);

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
