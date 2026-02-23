const { selectPartnerCards } = require("../../game_engine/powerhouse");
const { initTrick } = require("../../game_engine/tricks");
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

        if (gameState.phase !== "powerhouse") {
            if (callback) callback("Game is not in PowerHouse selection phase");
            return;
        }

        // PowerHouse must be selected first
        if (!gameState.powerHouseSuit) {
            if (callback) callback("Must select PowerHouse suit first");
            return;
        }

        const cards = data?.cards;
        const duplicateSpecs = data?.duplicateSpecs || [];

        if (!cards || !Array.isArray(cards)) {
            if (callback) callback("Must provide partner cards");
            return;
        }

        const result = selectPartnerCards(
            gameState,
            socket.user.id,
            cards,
            duplicateSpecs
        );

        if (result.error) {
            if (callback) callback(result.error);
            return;
        }

        // Transition to playing phase
        const leader = gameState.leader;
        const firstTrick = initTrick(leader, gameState.seatOrder);

        const newState = {
            ...result.state,
            phase: "playing",
            currentRound: 0,
            currentTrick: firstTrick,
            roundLeader: leader,
        };

        setGameState(gameState.gameId, newState);
        await persistCheckpoint(gameState.gameId);

        io.to(gameState.roomname).emit("game-phase-change", "playing");
        await broadcastGameState(io, newState);

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Select partners error:", error.message);
    }
};
