const Game = require('../../../models/Game');
const { createDeck } = require('../../../game_engine/deck');
const { computeTrumpSuit, getNextJudgementRound } = require('../../../game_engine/judgement/rounds');
const { getGameState, setGameState, persistCheckpoint, deleteGameState } = require('../../../game_engine/stateManager');
const { broadcastGameState } = require('./broadcastState');
const { scheduleJudgementAdvance, clearJudgementAdvance } = require('./judgementTimers');

/**
 * Advance from "finished" phase to the next Judgement round (trump-announce),
 * or to "series-finished" if all rounds are done.
 * Called by: scoreboard auto-advance timer, or manual all-ready in nextRound.js
 */
async function autoNextJudgementRound(io, gameId) {
    const gameState = getGameState(gameId);
    if (!gameState || gameState.phase !== 'finished') return;

    const nextRound = getNextJudgementRound(gameState);

    if (nextRound.done) {
        const rankings = gameState.seatOrder
            .map(pid => ({
                playerId: pid,
                name: gameState.playerNames[pid] || pid,
                score: gameState.scores[pid] || 0,
            }))
            .sort((a, b) => b.score - a.score)
            .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

        const finalState = { ...gameState, phase: 'series-finished', finalRankings: rankings };
        setGameState(gameId, finalState);
        // Reset ready flags now so players returning to lobby see ready=false immediately
        await Game.findByIdAndUpdate(gameId, {
            $set: {
                state: 'series-finished',
                'players.$[].ready': false,
            },
        });
        await persistCheckpoint(gameId);
        await broadcastGameState(io, finalState);
        io.to(gameState.roomname).emit('game-phase-change', 'series-finished');
        // Push fresh room data now so any client returning to lobby sees ready=false immediately
        io.to(gameState.roomname).emit('fetch-users-in-room');

        setTimeout(async () => {
            try {
                const cur = getGameState(gameId);
                if (!cur || cur.phase !== 'series-finished') return;
                await Game.findByIdAndUpdate(gameId, { $set: { state: 'lobby' } });
                deleteGameState(gameId);
                io.to(gameState.roomname).emit('game-series-complete', { finalRankings: rankings });
                io.to(gameState.roomname).emit('fetch-users-in-room');
            } catch (err) {
                console.error('[autoNextJudgementRound] series cleanup:', err.message);
            }
        }, 15000);
        return;
    }

    const { seatOrder, playerNames, playerAvatars, scores, config } = gameState;
    const newDealerIndex = (gameState.dealerIndex + 1) % seatOrder.length;
    const newSeriesRoundIndex = nextRound.seriesRoundIndex;
    const trumpSuit = computeTrumpSuit(config.trumpMode, newSeriesRoundIndex);
    const fullDeck = createDeck(config.decks);
    const tricksWon = {};
    for (const pid of seatOrder) tricksWon[pid] = 0;

    const newGameState = {
        ...gameState,
        phase: 'trump-announce',
        dealerIndex: newDealerIndex,
        dealer: seatOrder[newDealerIndex],
        shuffleQueue: [],
        unshuffledDeck: fullDeck,
        hands: {},
        cutCard: null,
        bidding: null,
        leader: null,
        currentRound: 0,
        currentTrick: null,
        tricks: [],
        roundLeader: null,
        trumpSuit,
        trumpCard: null,
        tricksWon,
        nextRoundReady: [],
        seriesRoundIndex: newSeriesRoundIndex,
        currentCardsPerRound: nextRound.cardsPerRound,
        scoringResult: null,
        scores,
    };

    clearJudgementAdvance(gameId);
    setGameState(gameId, newGameState);
    await Game.findByIdAndUpdate(gameId, { state: 'trump-announce' });
    await persistCheckpoint(gameId);
    await broadcastGameState(io, newGameState);
    io.to(gameState.roomname).emit('game-phase-change', 'trump-announce');

    // Auto-advance trump-announce → shuffling after 5s
    scheduleJudgementAdvance(gameId, 5000, () => proceedFromTrumpAnnounce(io, gameId));
}

/**
 * Advance from "trump-announce" to "shuffling".
 * Called by: auto-timer, or dealer clicking "Proceed to Shuffle"
 */
async function proceedFromTrumpAnnounce(io, gameId) {
    const gameState = getGameState(gameId);
    if (!gameState || gameState.phase !== 'trump-announce') return;

    clearJudgementAdvance(gameId);

    const newGameState = { ...gameState, phase: 'shuffling' };
    setGameState(gameId, newGameState);
    await Game.findByIdAndUpdate(gameId, { state: 'shuffling' });
    await persistCheckpoint(gameId);
    await broadcastGameState(io, newGameState);
    io.to(gameState.roomname).emit('game-phase-change', 'shuffling');
}

module.exports = { autoNextJudgementRound, proceedFromTrumpAnnounce };
