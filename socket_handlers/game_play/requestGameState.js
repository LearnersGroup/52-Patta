const { getValidPlays } = require("../../game_engine/tricks");
const { buildPublicView } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('game-request-state', async (socket, io, data, callback) => {
        const { gameState, error } = await findGameForSocket(socket);
        if (error) {
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
});
