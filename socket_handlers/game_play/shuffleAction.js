const User = require("../../models/User");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { getGameState, setGameState } = require("../../game_engine/stateManager");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('game-shuffle-action', async (socket, io, data, callback) => {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const gameId = user.gameroom.toString();
        const gameState = getGameState(gameId);

        if (!gameState || gameState.phase !== "shuffling") {
            if (callback) callback("Not in shuffling phase");
            return;
        }

        // Only the dealer can shuffle
        if (gameState.dealer !== socket.user.id) {
            if (callback) callback("Only the dealer can shuffle");
            return;
        }

        const { type } = data || {};
        if (!SHUFFLE_DEALING_CONFIG.SHUFFLE_TYPES.includes(type)) {
            if (callback) callback("Invalid shuffle type");
            return;
        }

        if (gameState.shuffleQueue.length >= SHUFFLE_DEALING_CONFIG.MAX_SHUFFLE_OPS) {
            if (callback) callback(`Maximum ${SHUFFLE_DEALING_CONFIG.MAX_SHUFFLE_OPS} shuffles allowed`);
            return;
        }

        // Add to queue
        gameState.shuffleQueue.push({ type });
        setGameState(gameId, gameState);

        // Broadcast shuffle status to all players in room
        const dealerName = gameState.playerNames[gameState.dealer] || "Dealer";
        io.to(gameState.roomname).emit("game-shuffle-status", {
            type,
            dealerName,
            shuffleQueue: gameState.shuffleQueue,
            queueLength: gameState.shuffleQueue.length,
        });
});
