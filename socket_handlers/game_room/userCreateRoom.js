const Game = require("../../models/Game");
const User = require("../../models/User");
const { checkConfig } = require("../../game_engine/config");
const wrapHandler = require('../wrapHandler');

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

async function generateUniqueCode() {
    let code;
    let attempts = 0;
    do {
        code = generateCode();
        attempts++;
    } while (attempts < 10 && await Game.exists({ code }));
    return code;
}

module.exports = wrapHandler('user-create-room', async (socket, io, data, callback) => {
    const {
        roomname,
        player_count,
        deck_count,
        bid_threshold,
        game_count,
        bid_window,
        inspect_time,
        game_type,
        max_cards_per_round,
        reverse_order,
    } = data;

    const normalizedGameType = game_type === "judgement" ? "judgement" : "kaliteri";

    if (!roomname || typeof roomname !== 'string') {
        callback("Room name is required");
        return;
    }
    const count = parseInt(player_count, 10);
    if (isNaN(count) || count > 13) {
        callback("Player count is invalid");
        return;
    }

    if (normalizedGameType === "kaliteri" && count < 4) {
        callback("Kaliteri player count must be between 4 and 13");
        return;
    }

    if (normalizedGameType === "judgement" && count < 3) {
        callback("Judgement player count must be between 3 and 13");
        return;
    }

    // Validate player/deck combination
    const deckCountParsed = deck_count === 1 || deck_count === 2
        ? deck_count
        : (normalizedGameType === "judgement"
            ? (count <= 6 ? 1 : 2)
            : (count <= 5 ? 1 : 2));
    if (normalizedGameType === "kaliteri") {
        const configCheck = checkConfig(count, deckCountParsed);
        if (!configCheck.valid) {
            callback(configCheck.reason);
            return;
        }
    } else {
        if (deckCountParsed === 1 && count > 6) {
            callback("Judgement with 1 deck supports up to 6 players");
            return;
        }
        if (deckCountParsed === 2 && count < 7) {
            callback("Judgement with 2 decks is for 7+ players");
            return;
        }
    }

    // Sanitize room name
    const sanitizedRoomname = roomname.replace(/<[^>]*>/g, '').trim().slice(0, 50);

    //check if player already in room
    let player = await User.findOne({ _id: socket.user.id });
    if (player["gameroom"] !== null && typeof player["gameroom"] === "object") {
        callback("Player Already in a room");
        return;
    }
    let game = await Game.findOne({ roomname: sanitizedRoomname });
    if (game) {
        callback("Gameroom Already exists");
        return;
    }

    const code = await generateUniqueCode();

    const gameData = {
        roomname: sanitizedRoomname,
        code,
        player_count: count,
        game_type: normalizedGameType,
        players: [{ playerId: socket.user.id, ready: true }],
        admin: socket.user.id,
    };
    gameData.deck_count = deckCountParsed;
    if (normalizedGameType === "kaliteri" && bid_threshold && typeof bid_threshold === 'number' && bid_threshold > 0) {
        gameData.bid_threshold = bid_threshold;
    }
    if (normalizedGameType === "kaliteri") {
        const bw = parseInt(bid_window, 10);
        if (!isNaN(bw) && bw >= 5 && bw <= 60) {
            gameData.bid_window = bw;
        }
        const it = parseInt(inspect_time, 10);
        if (!isNaN(it) && it >= 5 && it <= 30) {
            gameData.inspect_time = it;
        }

        const gc = parseInt(game_count, 10);
        if (!isNaN(gc) && gc >= 1 && gc <= 20) {
            gameData.game_count = gc;
        } else {
            gameData.game_count = count;
        }
    } else {
        const parsedMaxCards = parseInt(max_cards_per_round, 10);
        if (!isNaN(parsedMaxCards) && parsedMaxCards > 0) {
            gameData.max_cards_per_round = parsedMaxCards;
        }
        gameData.reverse_order = !!reverse_order;
    }

    game = new Game(gameData);
    game = await game.save();
    await User.findOneAndUpdate({ _id: socket.user.id }, { gameroom: game.id });

    await socket.join(sanitizedRoomname);
    socket.emit("redirect-to-game-room", game.id, (res) => {
        if (res.status === 200) {
            io.to(sanitizedRoomname).emit("room-message", `${socket.username} created ${sanitizedRoomname}!`);
            io.to(sanitizedRoomname).emit("fetch-users-in-room");
        }
    });
});
