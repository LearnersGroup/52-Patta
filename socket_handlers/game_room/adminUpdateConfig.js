const Game = require("../../models/Game");
const User = require("../../models/User");
const { checkConfig } = require("../../game_engine/config");
const wrapHandler = require("../wrapHandler");

function parseNumber(value) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

module.exports = wrapHandler("admin-update-config", async (socket, io, data, callback) => {
    const user = await User.findOne({ _id: socket.user.id });
    const game = await Game.findById(user?.gameroom).populate("admin", ["name"]);

    if (!game) {
        callback("Room does not exists");
        return;
    }

    const adminId = game.admin?._id?.toString?.() || game.admin?.toString?.();
    if (adminId !== socket.user.id) {
        callback("Only the room admin can update config");
        return;
    }

    if (game.state !== "lobby") {
        callback("Room settings can only be updated in lobby");
        return;
    }

    const incomingGameType = data?.game_type;
    const normalizedGameType = incomingGameType === "judgement"
        ? "judgement"
        : (incomingGameType === "mendikot"
            ? "mendikot"
            : (incomingGameType === "kaliteri" ? "kaliteri" : game.game_type));

    const currentPlayersCount = game.players.length;
    const requestedPlayerCount = data?.player_count ?? game.player_count;
    const count = parseNumber(requestedPlayerCount);

    if (count === null || count > 13) {
        callback("Player count is invalid");
        return;
    }

    if (data?.player_count !== undefined && count < currentPlayersCount) {
        callback(`Cannot set player count below current number of players (${currentPlayersCount})`);
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

    const deckCountRaw = data?.deck_count ?? game.deck_count;
    let deckCountParsed = parseNumber(deckCountRaw);
    if (deckCountParsed !== 1 && deckCountParsed !== 2) {
        deckCountParsed = normalizedGameType === "mendikot"
            ? 1
            : (normalizedGameType === "judgement"
                ? (count <= 6 ? 1 : 2)
                : (count <= 5 ? 1 : 2));
    }

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

    const autoplayValue = data?.autoplay !== undefined ? !!data.autoplay : (game.autoplay ?? true);

    const updates = {
        player_count: count,
        deck_count: deckCountParsed,
        game_type: normalizedGameType,
        autoplay: autoplayValue,
    };

    if (normalizedGameType === "kaliteri") {
        const gameCountValue = parseNumber(data?.game_count ?? game.game_count ?? count);
        if (gameCountValue === null || gameCountValue < 1 || gameCountValue > 20) {
            callback("Number of games must be between 1 and 20");
            return;
        }

        const bidWindowValue = parseNumber(data?.bid_window ?? game.bid_window ?? 15);
        if (bidWindowValue === null || bidWindowValue < 5 || bidWindowValue > 60) {
            callback("Bidding window must be between 5 and 60 seconds");
            return;
        }

        const inspectTimeValue = parseNumber(data?.inspect_time ?? game.inspect_time ?? 15);
        if (inspectTimeValue === null || inspectTimeValue < 5 || inspectTimeValue > 30) {
            callback("Inspect time must be between 5 and 30 seconds");
            return;
        }

        updates.game_count = gameCountValue;
        updates.bid_window = bidWindowValue;
        updates.inspect_time = inspectTimeValue;

        if (count % 2 === 1) {
            const bidStart = deckCountParsed === 1 ? 150 : 300;
            const bidMax = deckCountParsed === 1 ? 250 : 500;
            const thresholdRaw = data?.bid_threshold ?? game.bid_threshold ?? (Math.round(((bidStart + bidMax) / 2) / 5) * 5);
            const thresholdValue = parseNumber(thresholdRaw);
            if (
                thresholdValue === null ||
                thresholdValue < bidStart + 5 ||
                thresholdValue > bidMax ||
                thresholdValue % 5 !== 0
            ) {
                callback("Bid threshold is invalid");
                return;
            }
            updates.bid_threshold = thresholdValue;
        } else {
            updates.bid_threshold = null;
        }

        updates.max_cards_per_round = null;
        updates.reverse_order = false;
        updates.trump_mode = null;
        updates.scoreboard_time = null;
        updates.judgement_bid_time = null;
        updates.card_reveal_time = null;
    } else if (normalizedGameType === "judgement") {
        const maxPossible = Math.floor((52 * deckCountParsed) / count);

        const maxCardsRaw = data?.max_cards_per_round ?? game.max_cards_per_round ?? Math.min(7, maxPossible);
        const maxCardsValue = parseNumber(maxCardsRaw);
        if (maxCardsValue === null || maxCardsValue < 1 || maxCardsValue > maxPossible) {
            callback(`Max cards per round must be between 1 and ${maxPossible}`);
            return;
        }

        const trumpModeValue = data?.trump_mode ?? game.trump_mode ?? "fixed";
        if (trumpModeValue !== "fixed" && trumpModeValue !== "random") {
            callback("Trump mode is invalid");
            return;
        }

        const scoreboardValue = parseNumber(data?.scoreboard_time ?? game.scoreboard_time ?? 5);
        if (scoreboardValue === null || scoreboardValue < 3 || scoreboardValue > 30) {
            callback("Scoreboard display time must be between 3 and 30 seconds");
            return;
        }

        const cardRevealValue = parseNumber(data?.card_reveal_time ?? game.card_reveal_time ?? 10);
        if (cardRevealValue === null || cardRevealValue < 3 || cardRevealValue > 30) {
            callback("Card reveal time must be between 3 and 30 seconds");
            return;
        }

        let bidTimeValue = null;
        if (data?.judgement_bid_time === null) {
            bidTimeValue = null;
        } else {
            const parsedBidTime = parseNumber(data?.judgement_bid_time ?? game.judgement_bid_time);
            if (parsedBidTime !== null) {
                if (parsedBidTime < 5 || parsedBidTime > 60) {
                    callback("Bidding time limit must be between 5 and 60 seconds");
                    return;
                }
                bidTimeValue = parsedBidTime;
            }
        }

        updates.max_cards_per_round = maxCardsValue;
        updates.reverse_order = !!(data?.reverse_order ?? game.reverse_order);
        updates.trump_mode = trumpModeValue;
        updates.scoreboard_time = scoreboardValue;
        updates.judgement_bid_time = bidTimeValue;
        updates.card_reveal_time = cardRevealValue;

        updates.bid_threshold = null;
        updates.game_count = null;
        updates.bid_window = null;
        updates.inspect_time = null;
        updates.band_hukum_pick_phase = null;
        updates.rounds_count = null;
        updates.team_a_players = [];
        updates.team_b_players = [];
    } else {
        if (deckCountParsed !== 1 && deckCountParsed !== 2) {
            callback("Mendikot deck count must be 1 or 2");
            return;
        }

        const mendikotTrumpMode = data?.trump_mode ?? game.trump_mode ?? "band";
        if (mendikotTrumpMode !== "band" && mendikotTrumpMode !== "cut") {
            callback("Mendikot trump mode must be 'band' or 'cut'");
            return;
        }

        const roundsCountValue = parseNumber(data?.rounds_count ?? game.rounds_count ?? 5);
        if (roundsCountValue === null || roundsCountValue < 1 || roundsCountValue > 20) {
            callback("Mendikot rounds count must be between 1 and 20");
            return;
        }

        const pickPhaseValue = mendikotTrumpMode === "band"
            ? (data?.band_hukum_pick_phase !== undefined
                ? !!data.band_hukum_pick_phase
                : (game.band_hukum_pick_phase !== undefined && game.band_hukum_pick_phase !== null
                    ? !!game.band_hukum_pick_phase
                    : true))
            : false;

        // Recompute lobby teams from currently joined players if payload omitted.
        const currentPlayerIds = (game.players || []).map((p) => p.playerId.toString());
        const payloadTeamA = Array.isArray(data?.team_a_players)
            ? data.team_a_players.map((id) => id?.toString?.() || id).filter((id) => currentPlayerIds.includes(id))
            : null;
        const payloadTeamB = Array.isArray(data?.team_b_players)
            ? data.team_b_players.map((id) => id?.toString?.() || id).filter((id) => currentPlayerIds.includes(id))
            : null;

        let teamA = payloadTeamA;
        let teamB = payloadTeamB;
        if (!teamA && !teamB) {
            // Preserve existing DB assignments when payload omits teams.
            teamA = (game.team_a_players || [])
                .map((id) => id.toString())
                .filter((id) => currentPlayerIds.includes(id));
            teamB = (game.team_b_players || [])
                .map((id) => id.toString())
                .filter((id) => currentPlayerIds.includes(id));
            // Auto-assign any unassigned joiners into the smaller team.
            const assigned = new Set([...teamA, ...teamB]);
            const unassigned = currentPlayerIds.filter((id) => !assigned.has(id));
            for (const pid of unassigned) {
                if (teamA.length <= teamB.length) teamA.push(pid);
                else teamB.push(pid);
            }
        }
        if (!teamA) teamA = [];
        if (!teamB) teamB = [];

        updates.trump_mode = mendikotTrumpMode;
        updates.band_hukum_pick_phase = pickPhaseValue;
        updates.rounds_count = roundsCountValue;
        updates.team_a_players = teamA;
        updates.team_b_players = teamB;

        updates.max_cards_per_round = null;
        updates.reverse_order = false;
        updates.scoreboard_time = null;
        updates.judgement_bid_time = null;
        updates.card_reveal_time = null;
        updates.bid_threshold = null;
        updates.game_count = null;
        updates.bid_window = null;
        updates.inspect_time = null;
    }

    await Game.findOneAndUpdate({ _id: game.id }, updates, { new: true });

    const adminName = game.admin?.name || socket.username || "Admin";
    io.to(game.roomname).emit("room-message", `${adminName} updated room settings`);
    io.to(game.roomname).emit("fetch-users-in-room");
});
