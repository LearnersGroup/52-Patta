const Game = require("../../models/Game");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const { checkConfig } = require("../../game_engine/config");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('user-create-room', async (socket, io, data, callback) => {
    const { roomname, roompass, isPublic, player_count, deck_count, bid_threshold, game_count, bid_window, inspect_time } = data;

    if (!roomname || typeof roomname !== 'string') {
        callback("Room name is required");
        return;
    }
    const publicRoom = !!isPublic;
    if (!publicRoom) {
        if (!roompass || typeof roompass !== 'string' || roompass.length < 6) {
            callback("Password must be at least 6 characters");
            return;
        }
    }
    const count = parseInt(player_count, 10);
    if (isNaN(count) || count < 4 || count > 13) {
        callback("Player count must be between 4 and 13");
        return;
    }

    // Validate player/deck combination
    const deckCountParsed = deck_count === 1 || deck_count === 2
        ? deck_count
        : (count <= 5 ? 1 : 2);
    const configCheck = checkConfig(count, deckCountParsed);
    if (!configCheck.valid) {
        callback(configCheck.reason);
        return;
    }

    // Sanitize room name
    const sanitizedRoomname = roomname.replace(/<[^>]*>/g, '').trim().slice(0, 50);

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
            roompass: null,
            isPublic: publicRoom,
            player_count: count,
            players: [{playerId: socket.user.id}],
            admin: socket.user.id,
        };
        // Always persist validated deck_count
        gameData.deck_count = deckCountParsed;
        // Store bid threshold for odd-player variants
        if (bid_threshold && typeof bid_threshold === 'number' && bid_threshold > 0) {
            gameData.bid_threshold = bid_threshold;
        }
        // Store bidding window (seconds, 5–60, default null → server uses 15)
        const bw = parseInt(bid_window, 10);
        if (!isNaN(bw) && bw >= 5 && bw <= 60) {
            gameData.bid_window = bw;
        }
        // Store card inspect time (seconds, 5–30, default null → server uses 15)
        const it = parseInt(inspect_time, 10);
        if (!isNaN(it) && it >= 5 && it <= 30) {
            gameData.inspect_time = it;
        }
        // Store game count (defaults to player_count if not provided)
        const gc = parseInt(game_count, 10);
        if (!isNaN(gc) && gc >= 1 && gc <= 20) {
            gameData.game_count = gc;
        } else {
            gameData.game_count = count; // default to player count
        }
        game = new Game(gameData);

        // Encrypt password for private rooms only
        if (!publicRoom) {
            const salt = await bcrypt.genSalt(10);
            game.roompass = await bcrypt.hash(roompass, salt);
        }
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
});
