const Game = require("../../models/Game");
const GameLog = require("../../models/GameLog");
const { SHUFFLE_DEALING_CONFIG } = require("../../game_engine/config");
const { createDeck, removeTwos } = require("../../game_engine/deck");
const { getGameState, setGameState, persistCheckpoint, deleteGameState } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");

/**
 * Schedule auto-progression after a game ends.
 * Called from playCard.js when phase transitions to "finished".
 *
 * After SCOREBOARD_DISPLAY_MS:
 *   - If more games remain → start next game (shuffling phase)
 *   - If series complete → show final leaderboard, then return to lobby
 */
function scheduleAutoNextGame(io, gameId) {
    setTimeout(async () => {
        try {
            const gameState = getGameState(gameId);
            if (!gameState || gameState.phase !== "finished") return;

            // Persist a per-game GameLog row
            try {
                const game = await Game.findById(gameId).select("code game_type players").lean();
                const players = (game?.players || []).map((p) => ({
                    userId: p.playerId,
                    name: gameState.playerNames?.[p.playerId?.toString()] || "",
                    avatar: gameState.playerAvatars?.[p.playerId?.toString()] || "",
                }));
                // Compute per-game score deltas from snapshot taken at game start
                const playerDeltas = {};
                for (const pid of (gameState.seatOrder || [])) {
                    playerDeltas[pid] =
                        (gameState.scores?.[pid] || 0) - (gameState.scoresAtGameStart?.[pid] || 0);
                }

                const logEntry = await GameLog.create({
                    kind: "game",
                    roomId: gameId,
                    roomCode: game?.code || "",
                    gameType: gameState.game_type || game?.game_type,
                    seriesId: gameState.seriesId,
                    gameNumber: gameState.currentGameNumber,
                    players,
                    scoringResult: gameState.scoringResult || null,
                    playerDeltas,
                    bidTeamSuccess: gameState.scoringResult?.bidTeamSuccess ?? null,
                    startedAt: gameState.gameStartedAt ? new Date(gameState.gameStartedAt) : null,
                    finishedAt: new Date(),
                    durationMs: gameState.gameStartedAt ? Date.now() - gameState.gameStartedAt : null,
                });
                io.to(gameState.roomname).emit("room-log-append", {
                    _id: logEntry._id,
                    kind: "game",
                    gameNumber: logEntry.gameNumber,
                    gameType: logEntry.gameType,
                    scoringResult: logEntry.scoringResult,
                    playerDeltas: logEntry.playerDeltas,
                    bidTeamSuccess: logEntry.bidTeamSuccess,
                    players: logEntry.players,
                    finishedAt: logEntry.finishedAt,
                });
            } catch (logErr) {
                console.error("GameLog per-game persist error:", logErr.message);
            }

            if (gameState.currentGameNumber < gameState.totalGames) {
                await startNextGame(io, gameId, gameState);
            } else {
                await finishSeries(io, gameId, gameState);
            }
        } catch (error) {
            console.error("Auto next game error:", error.message);
        }
    }, SHUFFLE_DEALING_CONFIG.SCOREBOARD_DISPLAY_MS);
}

/**
 * Start the next game in the series — create fresh deck, rotate dealer,
 * transition to shuffling phase.
 */
async function startNextGame(io, gameId, existingState) {
    const { config, seatOrder, playerNames, playerAvatars, scores } = existingState;

    // Create and prepare fresh deck
    const fullDeck = createDeck(config.decks);
    const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);

    // Rotate dealer
    const newDealerIndex = (existingState.dealerIndex + 1) % seatOrder.length;

    // Build new game state for shuffling phase
    const newGameState = {
        gameId,
        roomname: existingState.roomname,
        config,
        phase: "shuffling",
        seatOrder,
        playerNames,
        playerAvatars: playerAvatars || {},
        removedTwos: removed,

        // Rotated dealer
        dealerIndex: newDealerIndex,
        dealer: seatOrder[newDealerIndex],

        // Fresh shuffling state
        shuffleQueue: [],
        unshuffledDeck: remainingDeck,

        // Cleared for dealing phase
        hands: {},
        cutCard: null,
        dealingConfig: {
            animationDurationMs: SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS,
        },

        // Game series tracking — increment
        currentGameNumber: existingState.currentGameNumber + 1,
        totalGames: existingState.totalGames,

        // Carry series metadata forward
        seriesId: existingState.seriesId,
        seriesStartedAt: existingState.seriesStartedAt,
        game_type: existingState.game_type,
        // Snapshot of cumulative scores before this game (for per-game delta computation)
        scoresAtGameStart: { ...scores },
        gameStartedAt: Date.now(),

        // Fresh game state
        bidding: null,
        leader: null,
        powerHouseSuit: null,
        partnerCards: [],
        teams: {
            bid: [],
            oppose: [...seatOrder],
        },
        revealedPartners: [],
        currentRound: 0,
        currentTrick: null,
        tricks: [],
        roundLeader: null,
        scores, // cumulative scores carried over
    };

    setGameState(gameId, newGameState);

    await Game.findByIdAndUpdate(gameId, { state: "shuffling" });
    await persistCheckpoint(gameId);

    await broadcastGameState(io, newGameState);
    io.to(existingState.roomname).emit("game-avatars", playerAvatars || {});

    if (removed.length > 0) {
        io.to(existingState.roomname).emit("game-cards-removed", removed);
    }

    io.to(existingState.roomname).emit("game-phase-change", "shuffling");
}

/**
 * Finish the entire series — compute final rankings,
 * show leaderboard, then return everyone to lobby.
 */
async function finishSeries(io, gameId, existingState) {
    // Compute final rankings sorted by score descending
    const rankings = existingState.seatOrder
        .map(pid => ({
            playerId: pid,
            name: existingState.playerNames[pid] || pid,
            score: existingState.scores[pid] || 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    existingState.phase = "series-finished";
    existingState.finalRankings = rankings;

    setGameState(gameId, existingState);

    // Persist a per-series GameLog row
    try {
        const game = await Game.findById(gameId).select("code game_type players").lean();
        const players = (game?.players || []).map((p) => ({
            userId: p.playerId,
            name: existingState.playerNames?.[p.playerId?.toString()] || "",
            avatar: existingState.playerAvatars?.[p.playerId?.toString()] || "",
        }));
        await GameLog.create({
            kind: "series",
            roomId: gameId,
            roomCode: game?.code || "",
            gameType: existingState.game_type || game?.game_type,
            seriesId: existingState.seriesId,
            players,
            finalRankings: rankings,
            winnerUserId: rankings[0]?.playerId || null,
            startedAt: existingState.seriesStartedAt ? new Date(existingState.seriesStartedAt) : null,
            finishedAt: new Date(),
            durationMs: existingState.seriesStartedAt ? Date.now() - existingState.seriesStartedAt : null,
        });
    } catch (logErr) {
        console.error("GameLog series persist error:", logErr.message);
    }

    // Reset ready flags now so players returning to lobby see ready=false immediately
    await Game.findByIdAndUpdate(gameId, {
        $set: {
            state: "series-finished",
            "players.$[].ready": false,
        },
    });
    await persistCheckpoint(gameId);

    await broadcastGameState(io, existingState);
    io.to(existingState.roomname).emit("game-phase-change", "series-finished");
    // Push fresh room data now so any client returning to lobby sees ready=false immediately
    io.to(existingState.roomname).emit("fetch-users-in-room");

    // After displaying the leaderboard, return to lobby
    setTimeout(async () => {
        try {
            const currentState = getGameState(gameId);
            if (!currentState || currentState.phase !== "series-finished") return;

            await Game.findByIdAndUpdate(gameId, { $set: { state: "lobby" } });

            // Clear in-memory game state
            deleteGameState(gameId);

            // Notify all players to return to lobby
            io.to(existingState.roomname).emit("game-series-complete", {
                finalRankings: rankings,
            });

            // Refresh lobby player list on all clients
            io.to(existingState.roomname).emit("fetch-users-in-room");
        } catch (error) {
            console.error("Series cleanup error:", error.message);
        }
    }, SHUFFLE_DEALING_CONFIG.SCOREBOARD_DISPLAY_MS);
}

module.exports = { scheduleAutoNextGame };
