const Game = require("../../models/Game");
const User = require("../../models/User");
const wrapHandler = require("../wrapHandler");

function fisherYates(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = wrapHandler("admin-randomize-teams", async (socket, io, data, callback) => {
    const user = await User.findOne({ _id: socket.user.id });
    const game = await Game.findById(user?.gameroom);

    if (!game) {
        callback("Room does not exists");
        return;
    }

    if (game.game_type !== "mendikot") {
        callback("Randomize teams is only available for Mendikot");
        return;
    }

    if (game.state !== "lobby") {
        callback("Teams can only be randomized in lobby");
        return;
    }

    if (game.admin.toString() !== socket.user.id) {
        callback("Only the room admin can randomize teams");
        return;
    }

    const players = game.players.map((p) => p.playerId.toString());
    if (players.length % 2 !== 0) {
        callback("Mendikot teams require an even number of players");
        return;
    }

    const shuffled = fisherYates(players);
    const half = shuffled.length / 2;
    const teamA = shuffled.slice(0, half);
    const teamB = shuffled.slice(half);

    await Game.findByIdAndUpdate(game.id, {
        team_a_players: teamA,
        team_b_players: teamB,
    });

    io.to(game.roomname).emit("mendikot-team-update", {
        team_a_players: teamA,
        team_b_players: teamB,
    });
    io.to(game.roomname).emit("fetch-users-in-room");
});
