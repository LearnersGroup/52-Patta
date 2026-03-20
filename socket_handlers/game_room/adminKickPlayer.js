const Game = require("../../models/Game");
const User = require("../../models/User");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler("admin-kick-player", async (socket, io, data, callback) => {
    const { playerId } = data || {};
    if (!playerId || typeof playerId !== "string") {
        callback("Player ID is required");
        return;
    }

    const user = await User.findOne({ _id: socket.user.id });
    const game = await Game.findById(user?.gameroom)
        .populate("admin", ["name"])
        .populate("players.playerId", ["name"]);

    if (!game) {
        callback("Room does not exists");
        return;
    }

    const adminId = game.admin?._id?.toString?.() || game.admin?.toString?.();
    if (adminId !== socket.user.id) {
        callback("Only the room admin can kick players");
        return;
    }

    if (game.state !== "lobby") {
        callback("Players can only be removed in lobby");
        return;
    }

    if (playerId === adminId) {
        callback("Admin cannot remove themselves");
        return;
    }

    const targetPlayer = game.players.find((entry) => {
        const id = entry.playerId?._id?.toString?.() || entry.playerId?.toString?.();
        return id === playerId;
    });

    if (!targetPlayer) {
        callback("Player is not in this room");
        return;
    }

    const playerName = targetPlayer.playerId?.name || "Player";
    const updatedPlayers = game.players.filter((entry) => {
        const id = entry.playerId?._id?.toString?.() || entry.playerId?.toString?.();
        return id !== playerId;
    });

    await Game.findOneAndUpdate({ _id: game.id }, { players: updatedPlayers });
    await User.findOneAndUpdate({ _id: playerId }, [
        { $unset: ["gameroom"] },
    ]);

    const socketsInRoom = await io.in(game.roomname).fetchSockets();
    for (const s of socketsInRoom) {
        if (s.user?.id === playerId) {
            await s.leave(game.roomname);
            s.emit("redirect-to-home-page");
            break;
        }
    }

    io.to(game.roomname).emit("room-message", `${playerName} was removed from the room`);
    io.to(game.roomname).emit("fetch-users-in-room");
});
