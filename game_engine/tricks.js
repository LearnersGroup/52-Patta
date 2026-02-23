const { getCardPoints, compareRanks } = require("./config");
const { cardsEqual, cardsMatch } = require("./deck");
const { isPlayersTurn, findCardInHand, validateCardPlay, canFollowSuit } = require("./validators");
const { checkPartnerReveal } = require("./powerhouse");

/**
 * Initialize a new trick (hand/round).
 */
function initTrick(roundLeader, seatOrder) {
    const leaderIndex = seatOrder.indexOf(roundLeader);
    return {
        ledSuit: null,
        plays: [],
        turnIndex: leaderIndex,
    };
}

/**
 * Play a card in the current trick.
 * Returns { state } on success, or { error } on failure.
 */
function playCard(gameState, playerId, card) {
    if (gameState.phase !== "playing") {
        return { error: "Game is not in playing phase" };
    }

    // Validate turn
    if (!isPlayersTurn(gameState, playerId)) {
        return { error: "Not your turn" };
    }

    // Validate card is in hand
    const cardIndex = findCardInHand(gameState.hands, playerId, card);
    if (cardIndex === -1) {
        return { error: "Card not in your hand" };
    }

    const hand = gameState.hands[playerId];
    const trick = gameState.currentTrick;
    const ledSuit = trick.ledSuit;

    // Validate suit-following rules
    const playValidation = validateCardPlay(hand, card, ledSuit, gameState.powerHouseSuit);
    if (!playValidation.valid) {
        return { error: playValidation.reason };
    }

    // --- Card is valid, apply the play ---

    // Remove card from hand
    const newHands = { ...gameState.hands };
    newHands[playerId] = [...hand];
    newHands[playerId].splice(cardIndex, 1);

    // Add card to trick
    const newPlays = [...trick.plays, { playerId, card, order: trick.plays.length }];
    const newLedSuit = trick.plays.length === 0 ? card.suit : ledSuit;

    let newState = {
        ...gameState,
        hands: newHands,
        currentTrick: {
            ...trick,
            ledSuit: newLedSuit,
            plays: newPlays,
        },
    };

    // Check for partner reveal
    const partnerRevealState = checkPartnerReveal(newState, playerId, card);
    if (partnerRevealState) {
        newState = partnerRevealState;
    }

    // Check if trick is complete
    if (newPlays.length === gameState.seatOrder.length) {
        return completeTrick(newState);
    }

    // Advance turn
    newState.currentTrick = {
        ...newState.currentTrick,
        turnIndex: getNextTurnIndex(gameState.seatOrder, trick.turnIndex),
    };

    return { state: newState };
}

/**
 * Complete a trick: determine winner, accumulate points, start next trick or end game.
 */
function completeTrick(gameState) {
    const trick = gameState.currentTrick;
    const winner = resolveTrick(trick, gameState.powerHouseSuit);
    const points = calculateTrickPoints(trick.plays);

    const completedTrick = {
        winner: winner.playerId,
        cards: trick.plays.map((p) => ({ playerId: p.playerId, card: p.card })),
        points,
    };

    const newTricks = [...(gameState.tricks || []), completedTrick];
    const newRound = gameState.currentRound + 1;

    // Check if game is over
    if (newRound >= gameState.config.rounds) {
        return {
            state: {
                ...gameState,
                tricks: newTricks,
                currentRound: newRound,
                currentTrick: null,
                phase: "scoring",
            },
        };
    }

    // Start next trick with winner as leader
    const newTrick = initTrick(winner.playerId, gameState.seatOrder);

    return {
        state: {
            ...gameState,
            tricks: newTricks,
            currentRound: newRound,
            currentTrick: newTrick,
            roundLeader: winner.playerId,
        },
    };
}

/**
 * Resolve who wins a completed trick.
 *
 * Priority:
 * 1. PowerHouse suit beats everything else
 * 2. Duplicate rule (2-deck): second identical card wins within same suit
 * 3. Highest card of the relevant suit wins
 */
function resolveTrick(trick, powerHouseSuit) {
    const plays = trick.plays;
    const ledSuit = trick.ledSuit;

    // Separate plays into PowerHouse plays and led-suit plays
    const powerHousePlays = plays.filter((p) => p.card.suit === powerHouseSuit);
    const ledSuitPlays = plays.filter((p) => p.card.suit === ledSuit);

    // If any PowerHouse cards were played (and PowerHouse is not the led suit)
    if (powerHousePlays.length > 0 && powerHouseSuit !== ledSuit) {
        return findWinnerInGroup(powerHousePlays);
    }

    // Otherwise, led suit determines winner
    if (ledSuitPlays.length > 0) {
        return findWinnerInGroup(ledSuitPlays);
    }

    // Fallback: first play wins (shouldn't happen if rules are followed)
    return plays[0];
}

/**
 * Find the winner within a group of same-suit plays.
 * Handles duplicate card rule: if two identical cards (same suit+rank),
 * the second one played wins.
 */
function findWinnerInGroup(plays) {
    let winner = plays[0];

    for (let i = 1; i < plays.length; i++) {
        const play = plays[i];

        // Check for duplicate (same suit and rank, different deckIndex)
        if (cardsMatch(play.card, winner.card)) {
            // Duplicate rule: later play wins
            winner = play;
        } else if (compareRanks(play.card.rank, winner.card.rank) > 0) {
            // Higher rank wins
            winner = play;
        }
    }

    return winner;
}

/**
 * Calculate total points for a set of cards played in a trick.
 */
function calculateTrickPoints(plays) {
    return plays.reduce((total, play) => total + getCardPoints(play.card), 0);
}

/**
 * Get the valid plays for a player given the current game state.
 * Used for UI highlighting.
 */
function getValidPlays(gameState, playerId) {
    if (gameState.phase !== "playing") return [];

    const { seatOrder, currentTrick, hands, powerHouseSuit } = gameState;
    if (seatOrder[currentTrick.turnIndex] !== playerId) return [];

    const hand = hands[playerId];
    if (!hand || hand.length === 0) return [];

    const ledSuit = currentTrick.ledSuit;

    // First play of trick — all cards are valid
    if (!ledSuit) {
        return hand;
    }

    // If player has cards of the led suit, they must play one
    if (canFollowSuit(hand, ledSuit)) {
        return hand.filter((c) => c.suit === ledSuit);
    }

    // Player doesn't have led suit — all cards are valid
    return hand;
}

/**
 * Get next turn index (clockwise).
 */
function getNextTurnIndex(seatOrder, currentIndex) {
    return (currentIndex + 1) % seatOrder.length;
}

module.exports = {
    initTrick,
    playCard,
    resolveTrick,
    calculateTrickPoints,
    getValidPlays,
};
