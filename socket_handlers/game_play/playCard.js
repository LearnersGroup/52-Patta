const { playCard: playCardEngine } = require("../../game_engine/tricks");
const { calculateGameResult, applyScoring } = require("../../game_engine/scoring");
const { calculateJudgementRoundResult, applyJudgementScoring } = require("../../game_engine/judgement/scoring");
const { getNextJudgementRound } = require("../../game_engine/judgement/rounds");
const { setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { scheduleAutoNextGame } = require("./autoNextGame");
const wrapHandler = require("../wrapHandler");

module.exports = wrapHandler('game-play-card', async (socket, io, data, callback) => {
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

    const isJudgement = gameState.game_type === "judgement";

    // Check for partner reveal and notify
    if (!isJudgement) {
        const previousRevealed = gameState.revealedPartners?.length || 0;
        const currentRevealed = newState.revealedPartners?.length || 0;
        if (currentRevealed > previousRevealed) {
            const newPartnerId = newState.revealedPartners[newState.revealedPartners.length - 1];
            io.to(gameState.roomname).emit("game-partner-revealed", {
                playerId: newPartnerId,
                card: { suit: card.suit, rank: card.rank },
            });
        }
    }

    // Check for trick completion
    const previousTricks = gameState.tricks?.length || 0;
    const currentTricks = newState.tricks?.length || 0;
    if (currentTricks > previousTricks) {
        const lastTrick = newState.tricks[newState.tricks.length - 1];
        io.to(gameState.roomname).emit("game-trick-result", {
            winner: lastTrick.winner,
            points: isJudgement ? undefined : lastTrick.points,
            cards: lastTrick.cards,
        });
    }

    // Check if game is over (phase transitioned to scoring)
    if (newState.phase === "scoring") {
        if (isJudgement) {
            const deltas = calculateJudgementRoundResult(
                newState.bidding?.bids || {},
                newState.tricksWon || {}
            );
            const nextScores = applyJudgementScoring(newState.scores || {}, deltas);
            const roundEntry = {
                roundNumber: (newState.seriesRoundIndex || 0) + 1,
                bids: { ...(newState.bidding?.bids || {}) },
                tricksWon: { ...(newState.tricksWon || {}) },
                deltas,
                cumulative: nextScores,
                trumpCard: newState.trumpCard || null,
                trumpSuit: newState.trumpSuit || null,
            };

            const nextRound = getNextJudgementRound(newState);
            newState = {
                ...newState,
                scores: nextScores,
                scoringResult: null,
                roundResults: [...(newState.roundResults || []), roundEntry],
                phase: nextRound.done ? "series-finished" : "finished",
                nextRoundReady: [],
            };

            io.to(gameState.roomname).emit("game-phase-change", newState.phase);
        } else {
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

            // Schedule auto-progression to next game (or series end)
            scheduleAutoNextGame(io, gameState.gameId);
        }
    }

    setGameState(gameState.gameId, newState);

    // Persist checkpoint every 3 tricks or on game end
    if (["finished", "series-finished"].includes(newState.phase) || currentTricks % 3 === 0) {
        await persistCheckpoint(gameState.gameId);
    }

    await broadcastGameState(io, newState);
});
