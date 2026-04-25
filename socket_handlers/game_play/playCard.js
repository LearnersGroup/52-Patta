const { playCard: playCardEngine, getValidPlays } = require("../../game_engine/tricks");
const { getGameState, setGameState, persistCheckpoint, deleteGameState } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { findGameForSocket } = require("./helpers/findGameForSocket");
const { scheduleAutoNextGame } = require("./autoNextGame");
const { scheduleJudgementAdvance } = require("./helpers/judgementTimers");
const { scheduleMendikotNextRound } = require("./helpers/mendikotTimers");
const { autoNextJudgementRound } = require("./helpers/autoNextJudgementRound");
const { recordPlay, recordTrickComplete } = require("../../game_engine/recording");
const Game = require("../../models/Game");
const wrapHandler = require("../wrapHandler");

require("../../game_engine/strategies");
const { getStrategy } = require("../../game_engine/gameRegistry");

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

    // Snapshot valid plays BEFORE the engine runs so we can record the
    // counterfactual alternatives the player had. The engine returns a new
    // state without mutating `gameState`, so this snapshot stays valid.
    const validPlaysBefore = getValidPlays(gameState, socket.user.id);

    const result = playCardEngine(gameState, socket.user.id, card);

    if (result.error) {
        // IMPORTANT: do NOT record rejected plays. A rejected play (wrong
        // turn, card already played, invalid card) would otherwise leave a
        // ghost entry in the trick log with handSizeBefore reflecting the
        // post-previous-play hand and validPlays=[] because it's no longer
        // the player's turn — producing duplicate/out-of-order records.
        if (callback) callback(result.error);
        return;
    }

    // Record only after the engine has accepted the play.
    recordPlay(gameState, socket.user.id, card, validPlaysBefore);

    let newState = result.state;

    const isJudgement = gameState.game_type === "judgement";

    // Check for partner reveal and notify (Kaliteri only)
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
        recordTrickComplete(newState, lastTrick);
        io.to(gameState.roomname).emit("game-trick-result", {
            winner: lastTrick.winner,
            points: isJudgement ? undefined : lastTrick.points,
            cards: lastTrick.cards,
        });
    }

    // Check if game is over (phase transitioned to scoring)
    if (newState.phase === "scoring") {
        const strategy = getStrategy(gameState.game_type);

        newState = strategy.onRoundEnd(io, gameState, newState);

        strategy.afterRoundEnd(io, gameState, newState, {
            scheduleAutoNextGame,
            scheduleJudgementAdvance,
            scheduleMendikotNextRound,
            autoNextJudgementRound,
            deleteGameState,
            Game,
            getGameState,
            setGameState,
            persistCheckpoint,
            broadcastGameState,
        });
    }

    setGameState(gameState.gameId, newState);

    // Persist checkpoint every 3 tricks or on game end
    if (["finished", "series-finished"].includes(newState.phase) || currentTricks % 3 === 0) {
        await persistCheckpoint(gameState.gameId);
    }

    await broadcastGameState(io, newState);
});
