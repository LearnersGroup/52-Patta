import * as deck from "@letele/playing-cards";

/**
 * Map a game engine CardObj { suit, rank, deckIndex } to a
 * @letele/playing-cards component name and return the component.
 *
 * Library naming: Suit letter (S/H/D/C) + rank lowercase
 *   rank "2"-"10" → "2"-"10"
 *   rank "J" → "j", "Q" → "q", "K" → "k", "A" → "a"
 *
 * Example: { suit: "S", rank: "A" } → "Sa" → deck.Sa
 */

const RANK_MAP = {
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    J: "j",
    Q: "q",
    K: "k",
    A: "a",
};

export function getCardComponent(card) {
    if (!card) return null;
    const key = card.suit + RANK_MAP[card.rank];
    return deck[key] || null;
}

export function getCardBackComponent() {
    return deck.B1;
}

/**
 * Build a unique string key for a card (used as React key).
 */
export function cardKey(card) {
    return `${card.suit}${card.rank}_${card.deckIndex ?? 0}`;
}

/**
 * Check if a card is in a list (by suit + rank + deckIndex).
 */
export function isCardInList(card, list) {
    return list.some(
        (c) =>
            c.suit === card.suit &&
            c.rank === card.rank &&
            (c.deckIndex ?? 0) === (card.deckIndex ?? 0)
    );
}

/**
 * Returns a display string for a suit.
 */
export function suitSymbol(suit) {
    const symbols = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
    return symbols[suit] || suit;
}

/**
 * Returns whether a suit is red.
 */
export function isRedSuit(suit) {
    return suit === "H" || suit === "D";
}
