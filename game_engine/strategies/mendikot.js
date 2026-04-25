const { SHUFFLE_DEALING_CONFIG } = require("../config");
const { createDeck, removeTwos } = require("../deck");
const { dealFromDealer } = require("../shuffle");
const { computeMendikotConfig } = require("../mendikot/config");
const { initTrick, updatePendingRevealDecision } = require("../mendikot/tricks");
const { autoRevealIfNeeded } = require("../mendikot/bandHukum");
const { classifyRoundResult } = require("../mendikot/scoring");
const { computeNextDealer } = require("../mendikot/dealerRotation");

function computeConfig(game, playerCount, deckCount) {
    return computeMendikotConfig(
        playerCount,
        deckCount,
        game.trump_mode || "band",
        game.band_hukum_pick_phase !== undefined ? !!game.band_hukum_pick_phase : true,
        game.rounds_count || 5,
        game.card_reveal_time || null
    );
}

function autoDeckCount(playerCount) {
    return playerCount <= 6 ? 1 : 2;
}

function buildInitialState({ gameId, game, config, seatOrder, playerNames, playerAvatars }) {
    const fullDeck = createDeck(config.decks);
    const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);
    const teamA = (game?.team_a_players || []).map((id) => id.toString());
    const teamB = (game?.team_b_players || []).map((id) => id.toString());
    const teams = { A: teamA, B: teamB };

    const adminId = game?.admin ? game.admin.toString() : null;
    const adminSeatIdx = adminId ? seatOrder.indexOf(adminId) : -1;
    const initialDealerIdx = adminSeatIdx >= 0 ? adminSeatIdx : 0;
    const initialDealerId = seatOrder[initialDealerIdx];
    const pickerIdx = (initialDealerIdx + 1) % seatOrder.length;
    const pickerId = config.trump_mode === "band" ? seatOrder[pickerIdx] : null;

    return {
        gameId,
        roomname: game.roomname,
        game_type: "mendikot",
        autoplay: game.autoplay ?? true,
        config,
        phase: "shuffling",
        seatOrder,
        playerNames,
        playerAvatars,
        removedTwos: removed,

        dealerIndex: initialDealerIdx,
        dealer: initialDealerId,

        shuffleQueue: [],
        unshuffledDeck: remainingDeck,
        hands: {},
        cutCard: null,
        dealingConfig: {
            animationDurationMs: SHUFFLE_DEALING_CONFIG.DEALING_ANIMATION_MS,
        },

        teams,
        currentRoundNumber: 1,
        totalRounds: config.rounds_count,
        round_results: [],
        session_totals: {
            A: {
                "win-by-tricks": 0,
                "win-by-mendi": 0,
                mendikot: 0,
                "52-card mendikot": 0,
            },
            B: {
                "win-by-tricks": 0,
                "win-by-mendi": 0,
                mendikot: 0,
                "52-card mendikot": 0,
            },
        },

        closed_trump_holder_id: pickerId,
        closed_trump_card: null,
        closed_trump_revealed: false,
        closed_trump_placeholder: pickerId
            ? { holderId: pickerId, holderName: playerNames?.[pickerId] || "" }
            : null,

        trump_suit: null,
        trump_revealed_at_trick: null,
        trump_activation: null,
        trump_asker_id: null,
        pending_trump_reveal_decision: null,

        leader: null,
        currentRound: 0,
        currentTrick: null,
        tricks: [],
        roundLeader: null,
        tricks_by_team: { A: 0, B: 0 },
        tens_by_team: { A: 0, B: 0 },
        tens_cards_by_team: { A: [], B: [] },
        first_to_n_tricks: null,
        nextRoundReady: [],
        scoreBoardTimeMs: SHUFFLE_DEALING_CONFIG.SCOREBOARD_DISPLAY_MS,
    };
}

function initialDbState() {
    return "shuffling";
}

function afterStart(io, gameState) {
    if (gameState.removedTwos.length > 0) {
        io.to(gameState.roomname).emit("game-cards-removed", gameState.removedTwos);
    }
    io.to(gameState.roomname).emit("game-phase-change", "shuffling");
}

function deal(processedDeck, gameState) {
    const { hands } = dealFromDealer(
        processedDeck,
        gameState.seatOrder,
        gameState.dealerIndex
    );

    return {
        hands,
        bidding: null,
        trumpCard: null,
        trumpSuit: gameState.trump_suit || null,
    };
}

function applyDealExtras(gameState) {
    gameState.currentRound = 0;
    gameState.tricks = [];
    gameState.roundLeader = null;
    gameState.tricks_by_team = { A: 0, B: 0 };
    gameState.tens_by_team = { A: 0, B: 0 };
    gameState.tens_cards_by_team = { A: [], B: [] };
    gameState.first_to_n_tricks = null;
    gameState.trump_asker_id = null;
    gameState.pending_trump_reveal_decision = null;
    gameState.nextRoundReady = [];

    if (gameState.config?.trump_mode === "band") {
        gameState.trump_suit = null;
        gameState.trump_revealed_at_trick = null;
        gameState.trump_activation = null;
        gameState.closed_trump_card = null;
        gameState.closed_trump_revealed = false;
        gameState.closed_trump_placeholder = gameState.closed_trump_holder_id
            ? {
                  holderId: gameState.closed_trump_holder_id,
                  holderName: gameState.playerNames?.[gameState.closed_trump_holder_id] || "",
              }
            : null;
    } else {
        gameState.trump_suit = null;
        gameState.trump_revealed_at_trick = null;
        gameState.trump_activation = null;
        gameState.closed_trump_card = null;
        gameState.closed_trump_revealed = false;
        gameState.closed_trump_placeholder = null;
        gameState.closed_trump_holder_id = null;
    }
}

function transitionToCardReveal(gameState) {
    // Band Hukum with manual pick: picker chooses first, then card-reveal happens
    // after the pick (handled in pickClosedTrump handler).
    if (gameState.config?.trump_mode === "band" && gameState.config?.band_hukum_pick_phase) {
        gameState.phase = "band-hukum-pick";
        return { revealMs: null };
    }
    const revealMs = gameState.config?.cardRevealTimeMs ?? 10000;
    gameState.phase = "card-reveal";
    return { revealMs };
}

function transitionFromCardReveal(gameState) {
    if (gameState.config?.trump_mode === "band") {
        if (gameState.config?.band_hukum_pick_phase) {
            // Should not be reached via dealCardsHandler; pick handler drives this path.
            gameState.phase = "band-hukum-pick";
            return { type: "mendikot", nextPhase: "band-hukum-pick" };
        }

        const pickerId = gameState.closed_trump_holder_id;
        const hand = pickerId ? gameState.hands?.[pickerId] || [] : [];
        const randomIndex = hand.length ? Math.floor(Math.random() * hand.length) : -1;
        if (randomIndex >= 0) {
            const [picked] = hand.splice(randomIndex, 1);
            gameState.closed_trump_card = picked;
            gameState.closed_trump_revealed = false;
            gameState.closed_trump_placeholder = {
                holderId: pickerId,
                holderName: gameState.playerNames?.[pickerId] || "",
            };
        }

        const holderIndex = gameState.seatOrder.indexOf(gameState.closed_trump_holder_id);
        const leaderIdx = holderIndex === -1
            ? 0
            : (holderIndex + 1) % gameState.seatOrder.length;
        const firstLeader = gameState.seatOrder[leaderIdx];

        gameState.phase = "playing";
        gameState.leader = firstLeader;
        gameState.roundLeader = firstLeader;
        gameState.currentTrick = initTrick(firstLeader, gameState.seatOrder);
        // Covers the degenerate cardsPerPlayer === 1 case where the holder
        // immediately leads the only trick — auto-reveal must fire before
        // the first play, same as completeTrick does between tricks.
        autoRevealIfNeeded(gameState, 0, firstLeader);
        updatePendingRevealDecision(gameState);

        return { type: "mendikot", nextPhase: "playing" };
    }

    // Cut Hukum: first leader is player to dealer's right (last dealt in clockwise dealing).
    // TODO: confirm cut-hukum first-leader direction with product — current implementation
    // picks the player to the dealer's right; spec discussion during planning flagged this as
    // assumed-correct but never explicitly confirmed.
    const dealerIndex = gameState.dealerIndex || 0;
    const leaderIndex = (dealerIndex - 1 + gameState.seatOrder.length) % gameState.seatOrder.length;
    const firstLeader = gameState.seatOrder[leaderIndex];

    gameState.phase = "playing";
    gameState.leader = firstLeader;
    gameState.roundLeader = firstLeader;
    gameState.currentTrick = initTrick(firstLeader, gameState.seatOrder);
    updatePendingRevealDecision(gameState);

    return { type: "mendikot", nextPhase: "playing" };
}

function onRoundEnd(io, gameState, newState) {
    const result = classifyRoundResult(newState);

    const nextTotals = {
        A: { ...(newState.session_totals?.A || {}) },
        B: { ...(newState.session_totals?.B || {}) },
    };
    nextTotals[result.winningTeam][result.type] =
        (nextTotals[result.winningTeam][result.type] || 0) + 1;

    const roundResults = [
        ...(newState.round_results || []),
        {
            roundNumber: newState.currentRoundNumber || 1,
            ...result,
            tricks_by_team: { ...(newState.tricks_by_team || {}) },
            tens_by_team: { ...(newState.tens_by_team || {}) },
            tens_cards_by_team: {
                A: [...(newState.tens_cards_by_team?.A || [])],
                B: [...(newState.tens_cards_by_team?.B || [])],
            },
            first_to_n_tricks: newState.first_to_n_tricks || null,
        },
    ];

    const isFinalRound = (newState.currentRoundNumber || 1) >= (newState.totalRounds || 1);

    return {
        ...newState,
        round_results: roundResults,
        session_totals: nextTotals,
        scoringResult: result,
        phase: isFinalRound ? "series-finished" : "finished",
        nextRoundReady: [],
    };
}

function afterRoundEnd(io, gameState, finalState, deps) {
    io.to(gameState.roomname).emit("game-phase-change", finalState.phase);
    io.to(gameState.roomname).emit("game-round-result", finalState.scoringResult);

    if (finalState.phase === "finished") {
        const { scheduleMendikotNextRound, getGameState, setGameState, persistCheckpoint, broadcastGameState, Game } = deps;
        scheduleMendikotNextRound(gameState.gameId, 10000, async () => {
            const currentState = getGameState(gameState.gameId);
            if (!currentState || currentState.phase !== "finished") return;
            await nextRound(io, gameState.gameId, currentState, {
                Game,
                setGameState,
                persistCheckpoint,
                broadcastGameState,
            });
        });
        return;
    }

    // series-finished -> brief scoreboard display then return to lobby
    setTimeout(async () => {
        const { Game, deleteGameState } = deps;
        try {
            await Game.findByIdAndUpdate(gameState.gameId, {
                $set: {
                    state: "lobby",
                    "players.$[].ready": false,
                    gameState: null,
                },
            });
            deleteGameState(gameState.gameId);
            io.to(gameState.roomname).emit("game-series-complete", {
                round_results: finalState.round_results || [],
                session_totals: finalState.session_totals || {},
            });
            io.to(gameState.roomname).emit("fetch-users-in-room");
        } catch (err) {
            // best effort
        }
    }, finalState.scoreBoardTimeMs || SHUFFLE_DEALING_CONFIG.SCOREBOARD_DISPLAY_MS);
}

async function nextRound(io, gameId, existingState, deps) {
    const { Game, setGameState, persistCheckpoint, broadcastGameState } = deps;

    const game = await Game.findById(gameId).populate("players.playerId", ["name", "avatar"]);
    if (!game) return;

    const seatOrder = [...existingState.seatOrder];
    const playerNames = { ...(existingState.playerNames || {}) };
    const playerAvatars = { ...(existingState.playerAvatars || {}) };

    const lastRoundResult = (existingState.round_results || [])[existingState.round_results.length - 1];
    const nextDealer = computeNextDealer(
        seatOrder,
        existingState.dealer,
        existingState.teams,
        lastRoundResult
    );
    const dealerIndex = seatOrder.indexOf(nextDealer);

    const fullDeck = createDeck(existingState.config.decks);
    const { remainingDeck, removedTwos } = removeTwos(fullDeck, existingState.config.removeTwos);

    const pickerId = existingState.config.trump_mode === "band"
        ? seatOrder[(dealerIndex + 1) % seatOrder.length]
        : null;

    const nextState = {
        ...existingState,
        phase: "shuffling",
        seatOrder,
        playerNames,
        playerAvatars,
        removedTwos,
        dealerIndex,
        dealer: nextDealer,
        shuffleQueue: [],
        unshuffledDeck: remainingDeck,
        hands: {},
        cutCard: null,
        currentRoundNumber: (existingState.currentRoundNumber || 1) + 1,

        closed_trump_holder_id: pickerId,
        closed_trump_card: null,
        closed_trump_revealed: false,
        closed_trump_placeholder: pickerId
            ? { holderId: pickerId, holderName: playerNames[pickerId] || "" }
            : null,

        trump_suit: null,
        trump_revealed_at_trick: null,
        trump_activation: null,
        trump_asker_id: null,
        pending_trump_reveal_decision: null,
        leader: null,
        currentRound: 0,
        currentTrick: null,
        tricks: [],
        roundLeader: null,
        tricks_by_team: { A: 0, B: 0 },
        tens_by_team: { A: 0, B: 0 },
        tens_cards_by_team: { A: [], B: [] },
        first_to_n_tricks: null,
        nextRoundReady: [],
        scoringResult: null,
    };

    setGameState(gameId, nextState);
    await Game.findByIdAndUpdate(gameId, { state: "shuffling" });
    await persistCheckpoint(gameId);

    await broadcastGameState(io, nextState);
    io.to(existingState.roomname).emit("game-avatars", playerAvatars || {});
    if (removedTwos.length > 0) {
        io.to(existingState.roomname).emit("game-cards-removed", removedTwos);
    }
    io.to(existingState.roomname).emit("game-phase-change", "shuffling");
}

function buildPublicView(gameState, handSizes) {
    return {
        gameId: gameState.gameId,
        game_type: "mendikot",
        autoplay: gameState.autoplay ?? true,
        phase: gameState.phase,
        config: gameState.config,
        seatOrder: gameState.seatOrder,
        playerNames: gameState.playerNames || {},
        removedTwos: gameState.removedTwos || [],

        dealer: gameState.dealer || null,
        dealerIndex: gameState.dealerIndex ?? 0,
        shuffleQueue: gameState.shuffleQueue || [],
        dealingConfig: gameState.dealingConfig || null,

        teams: gameState.teams || { A: [], B: [] },
        currentRoundNumber: gameState.currentRoundNumber || 1,
        totalRounds: gameState.totalRounds || gameState.config?.rounds_count || 1,

        closed_trump_holder_id: gameState.closed_trump_holder_id || null,
        closed_trump_revealed: !!gameState.closed_trump_revealed,
        closed_trump_placeholder: gameState.closed_trump_placeholder || null,
        closed_trump_card: gameState.closed_trump_revealed ? (gameState.closed_trump_card || null) : null,
        trump_suit: gameState.trump_suit || null,
        trump_revealed_at_trick: gameState.trump_revealed_at_trick,
        trump_asker_id: gameState.trump_asker_id || null,
        pending_trump_reveal_decision: gameState.pending_trump_reveal_decision || null,

        leader: gameState.leader || null,
        currentRound: gameState.currentRound || 0,
        currentTrick: gameState.currentTrick
            ? {
                  ...gameState.currentTrick,
                  currentTurn:
                      gameState.seatOrder[gameState.currentTrick.turnIndex] || null,
              }
            : null,
        tricks: (gameState.tricks || []).map((t) => ({
            winner: t.winner,
            points: t.points,
            cards: t.cards,
        })),
        roundLeader: gameState.roundLeader || null,
        handSizes,

        tens_by_team: gameState.tens_by_team || { A: 0, B: 0 },
        tens_cards_by_team: gameState.tens_cards_by_team || { A: [], B: [] },
        tricks_by_team: gameState.tricks_by_team || { A: 0, B: 0 },
        first_to_n_tricks: gameState.first_to_n_tricks || null,

        round_results: gameState.round_results || [],
        session_totals: gameState.session_totals || {
            A: {},
            B: {},
        },
        scoringResult: gameState.scoringResult || null,
        finalRankings: gameState.finalRankings || [],
    };
}

const { registerStrategy } = require("../gameRegistry");

registerStrategy("mendikot", {
    type: "mendikot",
    computeConfig,
    autoDeckCount,
    buildInitialState,
    initialDbState,
    afterStart,
    deal,
    applyDealExtras,
    transitionToCardReveal,
    transitionFromCardReveal,
    onRoundEnd,
    afterRoundEnd,
    nextRound,
    buildPublicView,
});
