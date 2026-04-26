const Game = require('../../../models/Game');
const GameLog = require('../../../models/GameLog');
const { createDeck } = require('../../../game_engine/deck');
const { computeTrumpSuit, getNextJudgementRound } = require('../../../game_engine/judgement/rounds');
const { getGameState, setGameState, persistCheckpoint, deleteGameState } = require('../../../game_engine/stateManager');
const { broadcastGameState } = require('./broadcastState');
const { clearJudgementAdvance } = require('./judgementTimers');

/**
 * Advance from "finished" phase to the next Judgement round (shuffling),
 * or to "series-finished" if all rounds are done.
 * Called by: scoreboard auto-advance timer, or manual all-ready in nextRound.js
 */
async function autoNextJudgementRound(io, gameId) {
    const gameState = getGameState(gameId);
    if (!gameState || gameState.phase !== 'finished') return;

    // Persist per-round GameLog row
    try {
        const game = await Game.findById(gameId).select('code game_type players').lean();
        const players = (game?.players || []).map((p) => ({
            userId: p.playerId,
            name: gameState.playerNames?.[p.playerId?.toString()] || '',
            avatar: gameState.playerAvatars?.[p.playerId?.toString()] || '',
        }));
        const lastRound = (gameState.roundResults || []).slice(-1)[0] || null;
        const playerDeltas = lastRound?.deltas || {};
        const logEntry = await GameLog.create({
            kind: 'game',
            roomId: gameId,
            roomCode: game?.code || '',
            gameType: gameState.game_type || game?.game_type || 'judgement',
            seriesId: gameState.seriesId,
            gameNumber: (gameState.seriesRoundIndex ?? 0) + 1,
            players,
            scoringResult: lastRound || null,
            playerDeltas,
            startedAt: gameState.gameStartedAt ? new Date(gameState.gameStartedAt) : null,
            finishedAt: new Date(),
            durationMs: gameState.gameStartedAt ? Date.now() - gameState.gameStartedAt : null,
        });
        io.to(gameState.roomname).emit('room-log-append', {
            _id: logEntry._id,
            kind: 'game',
            gameNumber: logEntry.gameNumber,
            gameType: logEntry.gameType,
            scoringResult: logEntry.scoringResult,
            playerDeltas: logEntry.playerDeltas,
            players: logEntry.players,
            finishedAt: logEntry.finishedAt,
        });
    } catch (logErr) {
        console.error('[autoNextJudgementRound] GameLog per-round persist error:', logErr.message);
    }

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

        // Persist series GameLog row for Judgement
        try {
            const game = await Game.findById(gameId).select('code game_type players').lean();
            const players = (game?.players || []).map((p) => ({
                userId: p.playerId,
                name: gameState.playerNames?.[p.playerId?.toString()] || '',
                avatar: gameState.playerAvatars?.[p.playerId?.toString()] || '',
            }));
            const seriesLogEntry = await GameLog.create({
                kind: 'series',
                roomId: gameId,
                roomCode: game?.code || '',
                gameType: gameState.game_type || game?.game_type || 'judgement',
                seriesId: gameState.seriesId,
                players,
                finalRankings: rankings,
                winnerUserId: rankings[0]?.playerId || null,
                playerCount: gameState.seatOrder?.length ?? null,
                deckCount: gameState.config?.decks ?? null,
                variant: gameState.config?.trumpMode === 'fixed' ? 'Fixed Trump' : null,
                startedAt: gameState.seriesStartedAt ? new Date(gameState.seriesStartedAt) : null,
                finishedAt: new Date(),
                durationMs: gameState.seriesStartedAt ? Date.now() - gameState.seriesStartedAt : null,
            });
            io.to(gameState.roomname).emit('room-series-log-append', {
                _id: seriesLogEntry._id,
                kind: 'series',
                seriesId: seriesLogEntry.seriesId?.toString(),
                gameType: seriesLogEntry.gameType,
                finalRankings: seriesLogEntry.finalRankings,
                playerCount: seriesLogEntry.playerCount,
                deckCount: seriesLogEntry.deckCount,
                variant: seriesLogEntry.variant,
                players: seriesLogEntry.players,
                finishedAt: seriesLogEntry.finishedAt,
                gameRows: new Array((gameState.seriesRoundIndex ?? 0) + 1).fill(null),
            });
        } catch (logErr) {
            console.error('[autoNextJudgementRound] GameLog series persist error:', logErr.message);
        }

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
        phase: 'shuffling',
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
        // Carry series metadata for GameLog
        game_type: gameState.game_type || 'judgement',
        seriesId: gameState.seriesId,
        seriesStartedAt: gameState.seriesStartedAt,
        scoresAtGameStart: { ...scores },
        gameStartedAt: Date.now(),
    };

    clearJudgementAdvance(gameId);
    setGameState(gameId, newGameState);
    await Game.findByIdAndUpdate(gameId, { state: 'shuffling' });
    await persistCheckpoint(gameId);
    await broadcastGameState(io, newGameState);
    io.to(gameState.roomname).emit('game-phase-change', 'shuffling');
}

module.exports = { autoNextJudgementRound };
