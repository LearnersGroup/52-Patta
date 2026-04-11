const { compareRanks } = require("../config");
const { cardsEqual, cardsMatch } = require("../deck");
const { isPlayersTurn, findCardInHand, canFollowSuit } = require("../validators");
const { autoRevealIfNeeded } = require("./bandHukum");
const { firstToNTricksWinner } = require("./scoring");

function getNextTurnIndex(seatOrder, currentIndex) {
    return (currentIndex + 1) % seatOrder.length;
}

function initTrick(roundLeader, seatOrder) {
    const leaderIndex = seatOrder.indexOf(roundLeader);
    return {
        ledSuit: null,
        plays: [],
        turnIndex: leaderIndex,
    };
}

function getTeamByPlayerId(state, playerId) {
    if ((state.teams?.A || []).includes(playerId)) return "A";
    if ((state.teams?.B || []).includes(playerId)) return "B";
    return null;
}

function isTrumpActiveForPlay(state, play) {
    const trumpSuit = state.trump_suit;
    if (!trumpSuit) return false;
    if (play.card.suit !== trumpSuit) return false;

    const activation = state.trump_activation;
    if (!activation) return true;

    if (play.trickIndex > activation.trickIndex) return true;
    if (play.trickIndex < activation.trickIndex) return false;
    return play.order >= activation.playOrder;
}

function findWinnerInGroup(plays) {
    let winner = plays[0];
    for (let i = 1; i < plays.length; i += 1) {
        const p = plays[i];
        if (cardsMatch(p.card, winner.card)) {
            winner = p; // last-played copy wins
            continue;
        }
        if (compareRanks(p.card.rank, winner.card.rank) > 0) {
            winner = p;
        }
    }
    return winner;
}

function resolveMendikotTrick(state, trick) {
    const plays = trick.plays || [];
    const ledSuit = trick.ledSuit;

    const trumpPlays = plays.filter((p) => isTrumpActiveForPlay(state, p));
    if (trumpPlays.length > 0) {
        return findWinnerInGroup(trumpPlays);
    }

    const ledSuitPlays = plays.filter((p) => p.card.suit === ledSuit);
    if (ledSuitPlays.length > 0) {
        return findWinnerInGroup(ledSuitPlays);
    }

    return plays[0] || null;
}

function updatePendingRevealDecision(state) {
    state.pending_trump_reveal_decision = null;
    if (state.config?.trump_mode !== "band") return;
    if (state.closed_trump_revealed || state.trump_suit) return;
    if (!state.currentTrick?.ledSuit) return;

    const turnPlayer = state.seatOrder?.[state.currentTrick.turnIndex];
    if (!turnPlayer) return;
    if (turnPlayer === state.closed_trump_holder_id) return;

    const hand = state.hands?.[turnPlayer] || [];
    const hasLedSuit = hand.some((c) => c.suit === state.currentTrick.ledSuit);
    if (hasLedSuit) return;

    state.pending_trump_reveal_decision = {
        playerId: turnPlayer,
        canReveal: true,
    };
}

function completeTrick(state) {
    const trick = state.currentTrick;
    const winner = resolveMendikotTrick(state, trick);

    const completedTrick = {
        winner: winner.playerId,
        cards: trick.plays.map((p) => ({ playerId: p.playerId, card: p.card })),
        points: 0,
    };

    const newTricks = [...(state.tricks || []), completedTrick];
    const newRound = (state.currentRound || 0) + 1;
    const winnerTeam = getTeamByPlayerId(state, winner.playerId);

    const tricksByTeam = {
        A: state.tricks_by_team?.A || 0,
        B: state.tricks_by_team?.B || 0,
    };
    if (winnerTeam) {
        tricksByTeam[winnerTeam] += 1;
    }

    const tensInTrick = trick.plays.filter((p) => p.card.rank === "10").map((p) => ({ ...p.card }));
    const tensByTeam = {
        A: state.tens_by_team?.A || 0,
        B: state.tens_by_team?.B || 0,
    };
    const tensCardsByTeam = {
        A: [...(state.tens_cards_by_team?.A || [])],
        B: [...(state.tens_cards_by_team?.B || [])],
    };
    if (winnerTeam && tensInTrick.length > 0) {
        tensByTeam[winnerTeam] += tensInTrick.length;
        tensCardsByTeam[winnerTeam].push(...tensInTrick);
    }

    const newState = {
        ...state,
        tricks: newTricks,
        currentRound: newRound,
        roundLeader: winner.playerId,
        tricks_by_team: tricksByTeam,
        tens_by_team: tensByTeam,
        tens_cards_by_team: tensCardsByTeam,
        trump_asker_id: null,
        pending_trump_reveal_decision: null,
    };

    if (newRound >= (state.config?.rounds || 0)) {
        if (tricksByTeam.A === tricksByTeam.B) {
            newState.first_to_n_tricks = firstToNTricksWinner(newTricks, state.teams, tricksByTeam.A);
        } else {
            newState.first_to_n_tricks = null;
        }

        newState.currentTrick = null;
        newState.phase = "scoring";
        return { state: newState };
    }

    const nextTrick = initTrick(winner.playerId, state.seatOrder);
    newState.currentTrick = nextTrick;
    // Auto-reveal may fire when the holder is about to lead the last trick.
    autoRevealIfNeeded(newState, newRound, winner.playerId);
    updatePendingRevealDecision(newState);
    return { state: newState };
}

function playCard(state, playerId, card) {
    if (state.phase !== "playing") {
        return { error: "Game is not in playing phase" };
    }

    if (!isPlayersTurn(state, playerId)) {
        return { error: "Not your turn" };
    }

    const cardIndex = findCardInHand(state.hands, playerId, card);
    if (cardIndex === -1) {
        return { error: "Card not in your hand" };
    }

    const trick = state.currentTrick;
    const ledSuit = trick.ledSuit;
    const hand = state.hands[playerId] || [];

    if (ledSuit && card.suit !== ledSuit && canFollowSuit(hand, ledSuit)) {
        return { error: `Must follow the led suit (${ledSuit})` };
    }

    if (state.trump_asker_id === playerId && state.trump_suit) {
        const hasTrump = hand.some((c) => c.suit === state.trump_suit);
        if (hasTrump && card.suit !== state.trump_suit) {
            return { error: `You revealed trump and must play ${state.trump_suit}` };
        }
    }

    const isVoidOnLedSuit = !!ledSuit && !canFollowSuit(hand, ledSuit);
    if (state.config?.trump_mode === "cut" && !state.trump_suit && isVoidOnLedSuit) {
        state.trump_suit = card.suit;
        state.trump_revealed_at_trick = state.currentRound;
        state.trump_activation = {
            trickIndex: state.currentRound,
            playOrder: trick.plays.length,
        };
    }

    const newHands = { ...state.hands };
    newHands[playerId] = [...hand];
    newHands[playerId].splice(cardIndex, 1);

    const newPlay = {
        playerId,
        card,
        order: trick.plays.length,
        trickIndex: state.currentRound,
    };
    const newPlays = [...trick.plays, newPlay];
    const newLedSuit = trick.plays.length === 0 ? card.suit : ledSuit;

    const newState = {
        ...state,
        hands: newHands,
        currentTrick: {
            ...trick,
            ledSuit: newLedSuit,
            plays: newPlays,
        },
        pending_trump_reveal_decision: null,
    };

    if (newPlays.length === state.seatOrder.length) {
        return completeTrick(newState);
    }

    const nextTurnIndex = getNextTurnIndex(state.seatOrder, trick.turnIndex);
    const nextPlayerId = state.seatOrder[nextTurnIndex];
    autoRevealIfNeeded(newState, newState.currentRound, nextPlayerId);
    newState.currentTrick.turnIndex = nextTurnIndex;

    updatePendingRevealDecision(newState);
    return { state: newState };
}

function getValidPlays(state, playerId) {
    if (state.phase !== "playing") return [];
    const trick = state.currentTrick;
    if (!trick) return [];
    if (state.seatOrder[trick.turnIndex] !== playerId) return [];

    const hand = state.hands?.[playerId] || [];
    if (!hand.length) return [];

    if (state.trump_asker_id === playerId && state.trump_suit) {
        const trumps = hand.filter((c) => c.suit === state.trump_suit);
        if (trumps.length > 0) return trumps;
    }

    const ledSuit = trick.ledSuit;
    if (!ledSuit) return hand;
    if (canFollowSuit(hand, ledSuit)) {
        return hand.filter((c) => c.suit === ledSuit);
    }
    return hand;
}

function removeCardFromHand(state, playerId, card) {
    const hand = state.hands?.[playerId] || [];
    const idx = hand.findIndex((c) => cardsEqual(c, card));
    if (idx === -1) return false;
    hand.splice(idx, 1);
    return true;
}

module.exports = {
    initTrick,
    playCard,
    getValidPlays,
    resolveMendikotTrick,
    updatePendingRevealDecision,
    removeCardFromHand,
};
