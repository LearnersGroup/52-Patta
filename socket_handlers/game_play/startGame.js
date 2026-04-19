const Game = require("../../models/Game");
const User = require("../../models/User");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { scheduleJudgementAdvance } = require("./helpers/judgementTimers");
const wrapHandler = require('../wrapHandler');

// Ensure all strategies are registered
require("../../game_engine/strategies");
const { getStrategy } = require("../../game_engine/gameRegistry");

function toId(value) {
    if (!value) return null;
    if (typeof value === "string") return value;
    return value.toString();
}

function buildAlternatingSeatOrder(teamA, teamB) {
    const out = [];
    for (let i = 0; i < teamA.length; i += 1) {
        out.push(teamA[i]);
        out.push(teamB[i]);
    }
    return out;
}

module.exports = wrapHandler('game-start', async (socket, io, data, callback) => {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const game = await Game.findById(user.gameroom)
            .populate("players.playerId", ["name", "avatar"]);
        if (!game) {
            if (callback) callback("Game room not found");
            return;
        }

        // Only admin can start the game
        if (game.admin.toString() !== socket.user.id) {
            if (callback) callback("Only the room admin can start the game");
            return;
        }

        // Check game is still in lobby (or series-finished before auto-cleanup fires)
        if (!["lobby", "series-finished"].includes(game.state)) {
            if (callback) callback("Game has already started");
            return;
        }

        // Check all players are ready
        const allReady = game.players.every((p) => p.ready);
        if (!allReady) {
            if (callback) callback("All players must be ready");
            return;
        }

        const playerCount = game.players.length;
        if (playerCount < game.player_count) {
            if (callback) callback(`Need ${game.player_count} players to start (${playerCount} joined)`);
            return;
        }

        const gameType = game.game_type || "kaliteri";

        let reseatedSeatOrder = null;
        if (gameType === "mendikot") {
            const roomPlayerIds = game.players.map((p) => p.playerId._id.toString());
            const roomPlayerSet = new Set(roomPlayerIds);
            const teamA = (game.team_a_players || []).map((id) => id.toString()).filter((id) => roomPlayerSet.has(id));
            const teamB = (game.team_b_players || []).map((id) => id.toString()).filter((id) => roomPlayerSet.has(id));

            if (teamA.length === 0 || teamB.length === 0 || teamA.length !== teamB.length) {
                if (callback) callback("Mendikot requires equal, non-empty Team A and Team B before start");
                return;
            }

            const covered = new Set([...teamA, ...teamB]);
            if (covered.size !== roomPlayerIds.length) {
                if (callback) callback("All players must be assigned to exactly one Mendikot team");
                return;
            }

            reseatedSeatOrder = buildAlternatingSeatOrder(teamA, teamB);
        }

        const strategy = getStrategy(gameType);

        // Determine deck count
        let deckCount = game.deck_count;
        if (!deckCount) {
            deckCount = strategy.autoDeckCount(playerCount);
        }

        // Get config
        let config;
        try {
            config = strategy.computeConfig(game, playerCount, deckCount);
        } catch (err) {
            if (callback) callback(err.message);
            return;
        }

        // Build seat order and player map from room list (clockwise)
        const seatOrder = reseatedSeatOrder || game.players.map((p) => p.playerId._id.toString());
        const playersById = {};
        for (const p of game.players) {
            playersById[toId(p.playerId._id)] = p;
        }

        const playerNames = {};
        const playerAvatars = {};
        for (const pid of seatOrder) {
            const p = playersById[pid];
            if (!p) {
                if (callback) callback("Unable to build Mendikot seat order from current players");
                return;
            }
            playerNames[pid] = p.playerId.name;
            playerAvatars[pid] = p.playerId.avatar || "";
        }

        // Initialize scores
        const scores = {};
        for (const pid of seatOrder) {
            scores[pid] = 0;
        }

        // Build initial game state via strategy
        const gameId = game._id.toString();
        const gameState = strategy.buildInitialState({
            gameId, game, config, seatOrder, playerNames, playerAvatars, scores,
        });

        // Store in memory
        setGameState(gameId, gameState);

        // Update game state in MongoDB
        await Game.findByIdAndUpdate(gameId, { state: strategy.initialDbState() });
        await persistCheckpoint(gameId);

        // Broadcast personalized state to all players
        await broadcastGameState(io, gameState);
        io.to(game.roomname).emit("game-avatars", playerAvatars || {});

        // Game-specific post-start actions
        strategy.afterStart(io, gameState, { scheduleJudgementAdvance });
});
