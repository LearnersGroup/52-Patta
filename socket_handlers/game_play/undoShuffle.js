const User = require("../../models/User");
const { getGameState, setGameState } = require("../../game_engine/stateManager");

module.exports = (socket, io) => async (data, callback) => {
    try {
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

        if (gameState.dealer !== socket.user.id) {
            if (callback) callback("Only the dealer can undo shuffles");
            return;
        }

        if (gameState.shuffleQueue.length === 0) {
            if (callback) callback("No shuffles to undo");
            return;
        }

        // Remove last shuffle from queue
        gameState.shuffleQueue.pop();
        setGameState(gameId, gameState);

        // Broadcast updated queue
        io.to(gameState.roomname).emit("game-shuffle-status", {
            type: null,
            dealerName: gameState.playerNames[gameState.dealer] || "Dealer",
            shuffleQueue: gameState.shuffleQueue,
            queueLength: gameState.shuffleQueue.length,
        });

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Undo shuffle error:", error.message);
    }
};
