const crypto = require("crypto");
const { SUITS, RANKS } = require("./config");

/**
 * Create a standard deck (or two decks) of cards.
 * Each card: { suit, rank, deckIndex }
 * deckIndex: 0 for single deck, 0 or 1 for two-deck games.
 */
function createDeck(deckCount) {
    const cards = [];
    for (let d = 0; d < deckCount; d++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                cards.push({ suit, rank, deckIndex: d });
            }
        }
    }
    return shuffleDeck(cards);
}

/**
 * Fisher-Yates shuffle using crypto for better randomness.
 * Returns a new shuffled array (does not mutate input).
 */
function shuffleDeck(cards) {
    const deck = [...cards];
    for (let i = deck.length - 1; i > 0; i--) {
        const randomBytes = crypto.randomBytes(4);
        const randomIndex = randomBytes.readUInt32BE(0) % (i + 1);
        [deck[i], deck[randomIndex]] = [deck[randomIndex], deck[i]];
    }
    return deck;
}

/**
 * Remove N twos from the deck with balanced suit distribution.
 * Picks one from each suit per round (round-robin), so:
 *   remove 2 → 1 from each of 2 random suits
 *   remove 4 → 1 from each suit
 *   remove 6 → 1 from each suit + 2 from 2 random suits
 *   remove 8 → 2 from each suit (2-deck)
 * Returns { remainingDeck, removedTwos }.
 */
function removeTwos(deck, removeCount) {
    if (removeCount === 0) {
        return { remainingDeck: [...deck], removedTwos: [] };
    }

    // Group twos by suit
    const twosBySuit = {};
    const others = [];
    for (const card of deck) {
        if (card.rank === "2") {
            if (!twosBySuit[card.suit]) twosBySuit[card.suit] = [];
            twosBySuit[card.suit].push(card);
        } else {
            others.push(card);
        }
    }

    // Shuffle within each suit for intra-suit randomness
    const suits = Object.keys(twosBySuit);
    for (const suit of suits) {
        twosBySuit[suit] = shuffleDeck(twosBySuit[suit]);
    }

    // Round-robin across suits: each pass shuffles the suit order so that
    // when removeCount % 4 != 0 the extra cards come from random suits.
    const removedTwos = [];
    while (removedTwos.length < removeCount) {
        const roundSuits = shuffleDeck([...suits]);
        for (const suit of roundSuits) {
            if (removedTwos.length >= removeCount) break;
            if (twosBySuit[suit].length > 0) {
                removedTwos.push(twosBySuit[suit].pop());
            }
        }
        // Safety: stop if all suits are exhausted
        if (suits.every((s) => twosBySuit[s].length === 0)) break;
    }

    // Remaining twos stay in the deck
    const keptTwos = suits.flatMap((s) => twosBySuit[s]);

    return {
        remainingDeck: [...keptTwos, ...others],
        removedTwos,
    };
}

/**
 * Deal cards to players clockwise, one card at a time.
 * seatOrder: array of player IDs in clockwise order.
 * Returns a Map-like object: { [playerId]: [card, ...] }
 */
function dealCards(deck, seatOrder) {
    const hands = {};
    for (const playerId of seatOrder) {
        hands[playerId] = [];
    }

    const shuffled = shuffleDeck(deck);
    for (let i = 0; i < shuffled.length; i++) {
        const playerIndex = i % seatOrder.length;
        hands[seatOrder[playerIndex]].push(shuffled[i]);
    }

    return hands;
}

/**
 * Check if two cards are identical (same suit, rank, and deckIndex).
 */
function cardsEqual(a, b) {
    return a.suit === b.suit && a.rank === b.rank && a.deckIndex === b.deckIndex;
}

/**
 * Check if two cards are duplicates (same suit and rank, different deckIndex).
 */
function cardsDuplicate(a, b) {
    return a.suit === b.suit && a.rank === b.rank && a.deckIndex !== b.deckIndex;
}

/**
 * Check if two cards match by suit and rank (ignoring deckIndex).
 */
function cardsMatch(a, b) {
    return a.suit === b.suit && a.rank === b.rank;
}

module.exports = {
    createDeck,
    shuffleDeck,
    removeTwos,
    dealCards,
    cardsEqual,
    cardsDuplicate,
    cardsMatch,
};
