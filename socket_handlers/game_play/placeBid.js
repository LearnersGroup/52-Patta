const { placeBid: placeBidEngine } = require("../../game_engine/bidding");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");

module.exports = (socket, io) => async (data, callback) => {
    try {
        const { gameState, error } = await findGameForSocket(socket);
        if (error) {
            if (callback) callback(error);
            return;
        }

        if (gameState.phase !== "bidding") {
            if (callback) callback("Game is not in bidding phase");
            return;
        }

        const amount = parseInt(data?.amount, 10);
        if (isNaN(amount)) {
            if (callback) callback("Invalid bid amount");
            return;
        }

        const result = placeBidEngine(
            gameState.bidding,
            gameState.seatOrder,
            gameState.config,
            socket.user.id,
            amount
        );

        if (result.error) {
            if (callback) callback(result.error);
            return;
        }

        const newState = { ...gameState, bidding: result.state };

        // Check if bidding is complete
        if (result.state.biddingComplete) {
            newState.leader = result.state.currentBidder;
            newState.phase = "powerhouse";
            newState.teams.bid = [result.state.currentBidder];
            newState.teams.oppose = gameState.seatOrder.filter(
                (id) => id !== result.state.currentBidder
            );
        }

        setGameState(gameState.gameId, newState);

        if (newState.phase === "powerhouse") {
            await persistCheckpoint(gameState.gameId);
            io.to(gameState.roomname).emit("game-phase-change", "powerhouse");
        }

        await broadcastGameState(io, newState);

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Place bid error:", error.message);
    }
};
