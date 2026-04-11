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
        trump_mode,
        band_hukum_pick_phase,
        rounds_count,
        scoreboard_time,
        judgement_bid_time,
        card_reveal_time,
        autoplay,
    } = data;

    const normalizedGameType = game_type === "judgement"
        ? "judgement"
        : (game_type === "mendikot" ? "mendikot" : "kaliteri");

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

    if (normalizedGameType === "mendikot" && ![4, 6, 8, 10, 12].includes(count)) {
        callback("Mendikot player count must be one of 4, 6, 8, 10, or 12");
        return;
    }

    if (normalizedGameType === "mendikot" && deck_count !== undefined && deck_count !== 1 && deck_count !== 2) {
        callback("Mendikot deck_count must be 1 or 2");
        return;
    }

    if (normalizedGameType === "mendikot" && trump_mode !== undefined && trump_mode !== "band" && trump_mode !== "cut") {
        callback("Mendikot trump_mode must be 'band' or 'cut'");
        return;
    }

    if (normalizedGameType === "mendikot" && rounds_count !== undefined) {
        const rc = parseInt(rounds_count, 10);
        if (isNaN(rc) || rc < 1 || rc > 20) {
            callback("Mendikot rounds_count must be between 1 and 20");
            return;
        }
    }

    // Validate player/deck combination
    const deckCountParsed = deck_count === 1 || deck_count === 2
        ? deck_count
        : (normalizedGameType === "mendikot"
            ? 1
            : (normalizedGameType === "judgement"
            ? (count <= 6 ? 1 : 2)
            : (count <= 5 ? 1 : 2)));
    if (normalizedGameType === "kaliteri") {
        const configCheck = checkConfig(count, deckCountParsed);
        if (!configCheck.valid) {
            callback(configCheck.reason);
            return;
        }
    } else if (normalizedGameType === "judgement") {
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
    gameData.autoplay = autoplay !== undefined ? !!autoplay : true;
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
    } else if (normalizedGameType === "judgement") {
        const parsedMaxCards = parseInt(max_cards_per_round, 10);
        if (!isNaN(parsedMaxCards) && parsedMaxCards > 0) {
            gameData.max_cards_per_round = parsedMaxCards;
        }
        gameData.reverse_order = !!reverse_order;
        if (trump_mode === "fixed" || trump_mode === "random") {
            gameData.trump_mode = trump_mode;
        }
        const sbt = parseInt(scoreboard_time, 10);
        if (!isNaN(sbt) && sbt >= 3 && sbt <= 30) {
            gameData.scoreboard_time = sbt;
        }
        const jbt = parseInt(judgement_bid_time, 10);
        if (!isNaN(jbt) && jbt >= 5 && jbt <= 60) {
            gameData.judgement_bid_time = jbt;
        }
        const crt = parseInt(card_reveal_time, 10);
        if (!isNaN(crt) && crt >= 3 && crt <= 30) {
            gameData.card_reveal_time = crt;
        }
    } else {
        gameData.max_cards_per_round = null;
        gameData.reverse_order = false;
        gameData.scoreboard_time = null;
        gameData.judgement_bid_time = null;
        gameData.card_reveal_time = null;
        gameData.bid_threshold = null;
        gameData.game_count = null;
        gameData.bid_window = null;
        gameData.inspect_time = null;

        gameData.trump_mode = (trump_mode === "band" || trump_mode === "cut") ? trump_mode : "band";
        gameData.band_hukum_pick_phase = gameData.trump_mode === "band"
            ? (band_hukum_pick_phase !== undefined ? !!band_hukum_pick_phase : true)
            : false;

        const rc = parseInt(rounds_count, 10);
        gameData.rounds_count = (!isNaN(rc) && rc >= 1 && rc <= 20) ? rc : 5;

        gameData.team_a_players = [socket.user.id];
        gameData.team_b_players = [];
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
