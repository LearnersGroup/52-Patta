const Game = require("../../models/Game");
const User = require("../../models/User");
const { getGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { scheduleLobbyDisconnect } = require("./lobbyGracePeriod");
const { scheduleAbandonmentIfEmpty } = require("./abandonedGameCleanup");

module.exports = (socket, io) => async () => {
    try {
        if (!socket.user) return;

        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) return;

        const game = await Game.findById(user.gameroom);
        if (!game) return;

        const gameId = game._id.toString();
        const playerId = socket.user.id;
        const isActiveGame = game.state !== "lobby";

        // If game is actively in progress, don't remove the player — just
        // persist a checkpoint so they can reconnect.
        if (isActiveGame) {
            io.to(game.roomname).emit(
                "room-message",
                `${socket.username || "A player"} has disconnected`
            );
            io.to(game.roomname).emit("game-player-disconnected", {
                playerId,
            });

            const gameState = getGameState(gameId);
            if (gameState) {
                await persistCheckpoint(gameId);
            }

            // If every player has now dropped, start an abandonment timer.
            // Re-checks liveness when it fires, so any reconnect cancels it.
            scheduleAbandonmentIfEmpty(io, gameId, game.roomname);
            return;
        }

        // --- Lobby disconnect: grace period before removal ---

        io.to(game.roomname).emit(
            "room-message",
            `${socket.username || "A player"} has disconnected`
        );

        // Schedule removal after 30 s — if they reconnect the timer is cancelled
        scheduleLobbyDisconnect(gameId, playerId, async () => {
            try {
                // Re-fetch game to get fresh state (it may have started while waiting)
                const freshGame = await Game.findById(gameId);
                if (!freshGame || freshGame.state !== "lobby") return;

                // Remove user's gameroom reference
                await User.findOneAndUpdate(
                    { _id: playerId },
                    { gameroom: null }
                );

                // If admin disconnects, close the room
                if (freshGame.admin.toString() === playerId) {
                    for (const player of freshGame.players) {
                        await User.findOneAndUpdate(
                            { _id: player.playerId },
                            { gameroom: null }
                        );
                    }
                    await Game.findOneAndDelete({ _id: freshGame._id });
                    io.to(freshGame.roomname).emit("redirect-to-home-page");
                    return;
                }

                // Remove player from room
                const updatedPlayers = freshGame.players.filter(
                    (player) => player.playerId.toString() !== playerId
                );
                await Game.findOneAndUpdate(
                    { _id: freshGame._id },
                    { players: updatedPlayers }
                );
                io.to(freshGame.roomname).emit("fetch-users-in-room");
            } catch (err) {
                console.error("Deferred lobby disconnect error");
            }
        });
    } catch (error) {
        console.error("Disconnect cleanup error");
    }
}
