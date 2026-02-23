const { cardsEqual } = require("./deck");

/**
 * Check if it's the given player's turn based on seat order and turn index.
 */
function isPlayersTurn(gameState, playerId) {
    const { seatOrder } = gameState;
    const currentPhase = gameState.phase;

    if (currentPhase === "bidding") {
        const { turnIndex } = gameState.bidding;
        return seatOrder[turnIndex] === playerId;
    }

    if (currentPhase === "playing") {
        const { turnIndex } = gameState.currentTrick;
        return seatOrder[turnIndex] === playerId;
    }

    return false;
}

/**
 * Check if a player has cards of the given suit in their hand.
 */
function canFollowSuit(hand, ledSuit) {
    return hand.some((card) => card.suit === ledSuit);
}

/**
 * Check if a specific card exists in the player's hand.
 * Returns the index if found, -1 otherwise.
 */
function findCardInHand(hands, playerId, card) {
    const hand = hands[playerId];
    if (!hand) return -1;
    return hand.findIndex((c) => cardsEqual(c, card));
}

/**
 * Validate that a card exists in the player's hand.
 */
function validateCardInHand(hands, playerId, card) {
    return findCardInHand(hands, playerId, card) !== -1;
}

/**
 * Validate that a card play follows the suit-following rules.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
function validateCardPlay(hand, card, ledSuit, powerHouseSuit) {
    // First card of the trick — anything goes
    if (!ledSuit) {
        return { valid: true };
    }

    // If the card follows the led suit, always valid
    if (card.suit === ledSuit) {
        return { valid: true };
    }

    // If the player has cards of the led suit, they MUST follow
    if (canFollowSuit(hand, ledSuit)) {
        return {
            valid: false,
            reason: `Must follow the led suit (${ledSuit})`,
        };
    }

    // Player doesn't have led suit — can play anything (PowerHouse or other)
    return { valid: true };
}

module.exports = {
    isPlayersTurn,
    canFollowSuit,
    findCardInHand,
    validateCardInHand,
    validateCardPlay,
};
