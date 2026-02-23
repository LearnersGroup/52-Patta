const { getValidPlays } = require("../../game_engine/tricks");
const { buildPublicView } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");

module.exports = (socket, io) => async (data, callback) => {
    try {
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

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Request game state error:", error.message);
    }
};
