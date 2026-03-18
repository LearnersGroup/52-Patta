const User = require("../../models/User");
const Game = require("../../models/Game");
const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { autoNextJudgementRound } = require("./helpers/autoNextJudgementRound");
const { clearJudgementAdvance } = require("./helpers/judgementTimers");
const wrapHandler = require('../wrapHandler');

require("../../game_engine/strategies");
const { getStrategy } = require("../../game_engine/gameRegistry");

module.exports = wrapHandler('game-next-round', async (socket, io, data, callback) => {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const gameId = user.gameroom.toString();
        const existingState = getGameState(gameId);

        if (!existingState || existingState.phase !== "finished") {
            if (callback) callback("Game is not in finished state");
            return;
        }

        // Track ready-for-next per player (shared for all game types)
        if (!existingState.nextRoundReady) {
            existingState.nextRoundReady = [];
        }

        const playerId = socket.user.id;
        if (!existingState.nextRoundReady.includes(playerId)) {
            existingState.nextRoundReady.push(playerId);
        }

        setGameState(gameId, existingState);

        // Broadcast readiness to all players
        io.to(existingState.roomname).emit("next-round-ready-update", {
            readyPlayers: existingState.nextRoundReady,
            totalPlayers: existingState.seatOrder.length,
        });

        // Check if all players are ready
        const allReady = existingState.seatOrder.every(
            (pid) => existingState.nextRoundReady.includes(pid)
        );

        if (!allReady) return;

        // --- All players ready, start next round via strategy ---
        const strategy = getStrategy(existingState.game_type);

        await strategy.nextRound(io, gameId, existingState, {
            Game,
            setGameState,
            persistCheckpoint,
            broadcastGameState,
            clearJudgementAdvance,
            autoNextJudgementRound,
        });
});
