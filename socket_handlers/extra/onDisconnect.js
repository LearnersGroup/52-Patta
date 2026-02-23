const Game = require("../../models/Game");
const User = require("../../models/User");
const { getGameState, persistCheckpoint } = require("../../game_engine/stateManager");

module.exports = (socket, io) => async () => {
    try {
        if (!socket.user) return;

        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) return;

        const game = await Game.findById(user.gameroom);
        if (!game) return;

        const gameId = game._id.toString();
        const isActiveGame = game.state !== "lobby";

        // If game is actively in progress, don't remove the player — just
        // persist a checkpoint so they can reconnect.
        if (isActiveGame) {
            io.to(game.roomname).emit(
                "room-message",
                `${socket.username || "A player"} has disconnected`
            );
            io.to(game.roomname).emit("game-player-disconnected", {
                playerId: socket.user.id,
            });

            const gameState = getGameState(gameId);
            if (gameState) {
                await persistCheckpoint(gameId);
            }
            return;
        }

        // --- Lobby disconnect: existing behavior ---

        // Notify room about disconnection
        io.to(game.roomname).emit(
            "room-message",
            `${socket.username || "A player"} has disconnected`
        );

        // Remove user's gameroom reference
        await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: null }
        );

        // If admin disconnects, close the room
        if (game.admin.toString() === socket.user.id) {
            for (const player of game.players) {
                await User.findOneAndUpdate(
                    { _id: player.playerId },
                    { gameroom: null }
                );
            }
            await Game.findOneAndDelete({ _id: game.id });
            io.to(game.roomname).emit("redirect-to-home-page");
            return;
        }

        // Remove player from room
        const updatedPlayers = game.players.filter(
            (player) => player.playerId.toString() !== socket.user.id
        );
        await Game.findOneAndUpdate(
            { _id: game.id },
            { players: updatedPlayers }
        );
        io.to(game.roomname).emit("fetch-users-in-room");
    } catch (error) {
        console.error("Disconnect cleanup error");
    }
}
