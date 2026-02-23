const { selectPowerHouse: selectPH } = require("../../game_engine/powerhouse");
const { setGameState } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");

module.exports = (socket, io) => async (data, callback) => {
    try {
        const { gameState, error } = await findGameForSocket(socket);
        if (error) {
            if (callback) callback(error);
            return;
        }

        if (gameState.phase !== "powerhouse") {
            if (callback) callback("Game is not in PowerHouse selection phase");
            return;
        }

        const suit = data?.suit;
        if (!suit) {
            if (callback) callback("Must provide a suit");
            return;
        }

        const result = selectPH(gameState, socket.user.id, suit);

        if (result.error) {
            if (callback) callback(result.error);
            return;
        }

        setGameState(gameState.gameId, result.state);
        await broadcastGameState(io, result.state);

        io.to(gameState.roomname).emit("room-message",
            `PowerHouse suit selected: ${suitName(suit)}`
        );

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Select PowerHouse error:", error.message);
    }
};

function suitName(suit) {
    const names = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
    return names[suit] || suit;
}
