const Game = require("../../models/Game");
const User = require("../../models/User");
const { findGameForSocket } = require("../game_play/helpers/findGameForSocket");
const { buildPublicView } = require("../game_play/helpers/broadcastState");
const { getValidPlays } = require("../../game_engine/tricks");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('user-join-room', async (socket, io, data, callback) => {
    const { code, id, roomname: rawRoomname } = data || {};

    let game = null;
    if (typeof code === 'string' && code.trim()) {
        const normalizedCode = code.trim().toUpperCase();
        game = await Game.findOne({ code: normalizedCode });
    } else if (typeof id === 'string' && id.trim()) {
        game = await Game.findById(id.trim());
    } else if (typeof rawRoomname === 'string' && rawRoomname.trim()) {
        game = await Game.findOne({ roomname: rawRoomname.trim() });
    } else {
        callback("Room code is required");
        return;
    }

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

        // Mendikot team auto-assignment: place joiner into the smaller team.
        if (updatedGame.game_type === "mendikot" && updatedGame.state === "lobby") {
            const a = (updatedGame.team_a_players || []).map((id) => id.toString());
            const b = (updatedGame.team_b_players || []).map((id) => id.toString());

            if (!a.includes(socket.user.id) && !b.includes(socket.user.id)) {
                if (a.length <= b.length) {
                    await Game.findByIdAndUpdate(updatedGame.id, {
                        $addToSet: { team_a_players: socket.user.id },
                        $pull: { team_b_players: socket.user.id },
                    });
                } else {
                    await Game.findByIdAndUpdate(updatedGame.id, {
                        $addToSet: { team_b_players: socket.user.id },
                        $pull: { team_a_players: socket.user.id },
                    });
                }
            }
        }

        //Update user game-room
        await User.findOneAndUpdate(
            { _id: socket.user.id },
            { gameroom: updatedGame.id }
        );
        await socket.join(roomname);
        socket.emit("redirect-to-game-room", game.id, async (res) => {
            if (res.status === 200) {
                io.to(roomname).emit(
                    "room-message",
                    `${socket.username} has joined!`
                );
                io.to(roomname).emit("fetch-users-in-room");
                if (updatedGame.game_type === "mendikot") {
                    const refreshed = await Game.findById(updatedGame.id).select("team_a_players team_b_players");
                    io.to(roomname).emit("mendikot-team-update", {
                        team_a_players: refreshed?.team_a_players || [],
                        team_b_players: refreshed?.team_b_players || [],
                    });
                }
            }
        });
});
