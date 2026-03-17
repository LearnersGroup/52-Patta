const User = require("../../models/User");
const Game = require("../../models/Game");
const { createDeck, removeTwos, dealCards } = require("../../game_engine/deck");
const { initBidding } = require("../../game_engine/bidding");
const { getNextJudgementRound } = require("../../game_engine/judgement/rounds");
const { getGameState, setGameState, persistCheckpoint } = require("../../game_engine/stateManager");
const { broadcastGameState } = require("./helpers/broadcastState");
const { autoNextJudgementRound } = require("./helpers/autoNextJudgementRound");
const { clearJudgementAdvance } = require("./helpers/judgementTimers");
const wrapHandler = require('../wrapHandler');

module.exports = wrapHandler('game-next-round', async (socket, io, data, callback) => {
        const user = await User.findOne({ _id: socket.user.id });
        if (!user || !user.gameroom) {
            if (callback) callback("Not in a game room");
            return;
        }

        const gameId = user.gameroom.toString();
        const existingState = getGameState(gameId);

        if (!existingState || existingState.phase !== "finished") {
            if (callback) callback("Game is not in finished state");
            return;
        }

        // Track ready-for-next per player (shared for all game types)
        if (!existingState.nextRoundReady) {
            existingState.nextRoundReady = [];
        }

        const playerId = socket.user.id;
        if (!existingState.nextRoundReady.includes(playerId)) {
            existingState.nextRoundReady.push(playerId);
        }

        setGameState(gameId, existingState);

        // Broadcast readiness to all players
        io.to(existingState.roomname).emit("next-round-ready-update", {
            readyPlayers: existingState.nextRoundReady,
            totalPlayers: existingState.seatOrder.length,
        });

        // Check if all players are ready
        const allReady = existingState.seatOrder.every(
            (pid) => existingState.nextRoundReady.includes(pid)
        );

        if (!allReady) return;

        // --- All players ready, start next round ---

        if (existingState.game_type === "judgement") {
            // Cancel auto-advance timer (manual advance takes over)
            clearJudgementAdvance(gameId);
            await autoNextJudgementRound(io, gameId);
            return;
        }

        const game = await Game.findById(gameId)
            .populate("players.playerId", ["name"]);
        if (!game) {
            if (callback) callback("Game room not found");
            return;
        }

        const { config, seatOrder, playerNames, playerAvatars, scores } = existingState;

        // Create and prepare fresh deck
        const fullDeck = createDeck(config.decks);
        const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);

        // Deal new cards
        const hands = dealCards(remainingDeck, seatOrder);

        // Initialize fresh bidding
        const bidding = initBidding(config, seatOrder);

        // Build new game state — carry over cumulative scores
        const newGameState = {
            gameId,
            roomname: existingState.roomname,
            config,
            phase: "bidding",
            seatOrder,
            playerNames,
            playerAvatars: playerAvatars || {},
            removedTwos: removed,
            hands,
            bidding,
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

        // Store in memory
        setGameState(gameId, newGameState);

        // Update DB
        await Game.findByIdAndUpdate(gameId, { state: "bidding" });
        await persistCheckpoint(gameId);

        // Broadcast to all players
        await broadcastGameState(io, newGameState);
        io.to(existingState.roomname).emit("game-avatars", playerAvatars || {});

        if (removed.length > 0) {
            io.to(existingState.roomname).emit("game-cards-removed", removed);
        }

        io.to(existingState.roomname).emit("game-phase-change", "bidding");
});
