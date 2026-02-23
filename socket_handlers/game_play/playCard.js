const { playCard: playCardEngine } = require("../../game_engine/tricks");
const { calculateGameResult, applyScoring } = require("../../game_engine/scoring");
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

        if (gameState.phase !== "playing") {
            if (callback) callback("Game is not in playing phase");
            return;
        }

        const card = data?.card;
        if (!card || !card.suit || !card.rank) {
            if (callback) callback("Invalid card");
            return;
        }

        // Ensure deckIndex is present (default to 0 for single deck)
        if (card.deckIndex === undefined) {
            card.deckIndex = 0;
        }

        const result = playCardEngine(gameState, socket.user.id, card);

        if (result.error) {
            if (callback) callback(result.error);
            return;
        }

        let newState = result.state;

        // Check for partner reveal and notify
        const previousRevealed = gameState.revealedPartners?.length || 0;
        const currentRevealed = newState.revealedPartners?.length || 0;
        if (currentRevealed > previousRevealed) {
            const newPartnerId = newState.revealedPartners[newState.revealedPartners.length - 1];
            io.to(gameState.roomname).emit("game-partner-revealed", {
                playerId: newPartnerId,
                card: { suit: card.suit, rank: card.rank },
            });
        }

        // Check for trick completion
        const previousTricks = gameState.tricks?.length || 0;
        const currentTricks = newState.tricks?.length || 0;
        if (currentTricks > previousTricks) {
            const lastTrick = newState.tricks[newState.tricks.length - 1];
            io.to(gameState.roomname).emit("game-trick-result", {
                winner: lastTrick.winner,
                points: lastTrick.points,
                cards: lastTrick.cards,
            });
        }

        // Check if game is over (phase transitioned to scoring)
        if (newState.phase === "scoring") {
            // Finalize teams: any unrevealed partner cards — those players stay on opposing team
            const scoringResult = calculateGameResult(newState);
            const newScores = applyScoring(newState.scores, scoringResult);

            newState = {
                ...newState,
                scores: newScores,
                scoringResult,
                phase: "finished",
            };

            io.to(gameState.roomname).emit("game-phase-change", "finished");
            io.to(gameState.roomname).emit("game-result", scoringResult);
        }

        setGameState(gameState.gameId, newState);

        // Persist checkpoint every 3 tricks or on game end
        if (newState.phase === "finished" || currentTricks % 3 === 0) {
            await persistCheckpoint(gameState.gameId);
        }

        await broadcastGameState(io, newState);

    } catch (error) {
        if (callback) callback("An error occurred");
        console.error("Play card error:", error.message);
    }
};
