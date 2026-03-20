const Game = require("../../models/Game");
const User = require("../../models/User");
const { findGameForSocket } = require("../game_play/helpers/findGameForSocket");
const { buildPublicView } = require("../game_play/helpers/broadcastState");
const { getValidPlays } = require("../../game_engine/tricks");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('user-join-room', async (socket, io, data, callback) => {
    const { code } = data;

    if (!code || typeof code !== 'string') {
        callback("Room code is required");
        return;
    }

    const normalizedCode = code.trim().toUpperCase();
        let game = await Game.findOne({ code: normalizedCode });
        if (!game) {
            callback("Room does not exists");
            return;
        }

        const roomname = game.roomname;

        //verify player not already in the room
        const playerInRoom = game.players.some(player => player.playerId.toString() === socket.user.id);
        if (playerInRoom) {
            await socket.join(roomname);
            socket.emit("redirect-to-game-room", game.id, (res) => {
                if (res.status === 200) {
                    io.to(roomname).emit(
                        "room-message",
                        `${socket.username} has reconnected!`
                    );
                    io.to(roomname).emit("fetch-users-in-room");

                    // If an active game is in progress, send them the game state
                    if (game.state !== "lobby") {
                        findGameForSocket(socket).then(({ gameState }) => {
                            if (gameState) {
                                const playerId = socket.user.id;
                                const publicView = buildPublicView(gameState);
                                const personalView = {
                                    ...publicView,
                                    myHand: gameState.hands[playerId] || [],
                                    validPlays: gameState.phase === "playing"
                                        ? getValidPlays(gameState, playerId)
                                        : [],
                                };
                                socket.emit("game-state-update", personalView);
                                socket.emit("game-avatars", gameState.playerAvatars || {});
                                io.to(roomname).emit("game-player-reconnected", {
                                    playerId,
                                });
                            }
                        });
                    }
                }
            });
            return;
        }

        //check if player already in room
        let player = await User.findOne({ _id: socket.user.id });
        if (
            player["gameroom"] !== null &&
            typeof player["gameroom"] === "object"
        ) {
            callback("Player Already in a room");
            return;
        }

        //Check if room full - use atomic operation to prevent race condition
        const updatedGame = await Game.findOneAndUpdate(
            {
                _id: game.id,
                $expr: { $lt: [{ $size: "$players" }, "$player_count"] }
            },
            { $push: { players: { playerId: socket.user.id, ready: true } } },
            { new: true }
        );

        if (!updatedGame) {
            callback("Room is full");
            return;
        }

        //Update user game-room
        await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: updatedGame.id }
        );
        await socket.join(roomname);
        socket.emit("redirect-to-game-room", game.id, (res) => {
            if (res.status === 200) {
                io.to(roomname).emit(
                    "room-message",
                    `${socket.username} has joined!`
                );
                io.to(roomname).emit("fetch-users-in-room");
            }
        });
});
