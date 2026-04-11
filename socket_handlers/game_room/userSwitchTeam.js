const Game = require("../../models/Game");
const User = require("../../models/User");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler("user-switch-team", async (socket, io, data, callback) => {
    const user = await User.findOne({ _id: socket.user.id });
    const game = await Game.findById(user?.gameroom);

    if (!game) {
        callback("Room does not exists");
        return;
    }

    if (game.game_type !== "mendikot") {
        callback("Team switching is only available for Mendikot");
        return;
    }

    if (game.state !== "lobby") {
        callback("Teams can only be changed in lobby");
        return;
    }

    const playerId = socket.user.id;
    const inRoom = game.players.some((p) => p.playerId.toString() === playerId);
    if (!inRoom) {
        callback("Player is not in this room");
        return;
    }

    const teamA = (game.team_a_players || []).map((id) => id.toString());
    const teamB = (game.team_b_players || []).map((id) => id.toString());
    const inA = teamA.includes(playerId);
    const inB = teamB.includes(playerId);

    if (!inA && !inB) {
        await Game.findByIdAndUpdate(game.id, {
            $addToSet: { team_a_players: playerId },
            $pull: { team_b_players: playerId },
        });
    } else if (inA) {
        await Game.findByIdAndUpdate(game.id, {
            $pull: { team_a_players: playerId },
            $addToSet: { team_b_players: playerId },
        });
    } else {
        await Game.findByIdAndUpdate(game.id, {
            $pull: { team_b_players: playerId },
            $addToSet: { team_a_players: playerId },
        });
    }

    const refreshed = await Game.findById(game.id).select("team_a_players team_b_players");
    io.to(game.roomname).emit("mendikot-team-update", {
        team_a_players: refreshed?.team_a_players || [],
        team_b_players: refreshed?.team_b_players || [],
    });
    io.to(game.roomname).emit("fetch-users-in-room");
});
