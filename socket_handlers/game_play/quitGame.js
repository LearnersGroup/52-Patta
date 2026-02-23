const Game = require("../../models/Game");
const User = require("../../models/User");
const { deleteGameState } = require("../../game_engine/stateManager");
const { findGameForSocket } = require("./helpers/findGameForSocket");

module.exports = (socket, io) => async (data, callback) => {
    try {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const game = await Game.findById(user.gameroom);
        if (!game) {
            if (callback) callback("Game room not found");
            return;
        }

        // Only admin can quit the game
        if (game.admin.toString() !== socket.user.id) {
            if (callback) callback("Only the room admin can quit the game");
            return;
        }

        // Only allow quitting an active game (not lobby)
        if (game.state === "lobby") {
            if (callback) callback("Game has not started yet");
            return;
        }

        const gameId = game._id.toString();

        // Clear in-memory game state
        deleteGameState(gameId);

        // Reset game back to lobby in DB — clear gameState, reset ready flags
        const resetPlayers = game.players.map((p) => ({
            playerId: p.playerId,
            ready: false,
        }));

        await Game.findByIdAndUpdate(gameId, {
            state: "lobby",
            gameState: null,
            players: resetPlayers,
        });

        // Notify all players — client will reset Redux and show lobby
        io.to(game.roomname).emit("game-quit");
        io.to(game.roomname).emit("fetch-users-in-room");
        io.to(game.roomname).emit(
            "room-message",
            "The admin has ended the game. Returning to lobby..."
        );

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Quit game error:", error.message);
    }
};
