const { getValidPlays } = require("../../game_engine/tricks");
const { buildPublicView } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('game-request-state', async (socket, io, data, callback) => {
        const { gameState, error } = await findGameForSocket(socket);
        if (error) {
            // Silently ignore if there's no active game yet (e.g. player just
            // entered a lobby — game state only exists after the game starts).
            if (error === 'No active game found') return;
            if (callback) callback(error);
            return;
        }

        const playerId = socket.user.id;

        // Build personalized view for this player
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
});
