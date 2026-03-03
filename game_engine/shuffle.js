const crypto = require("crypto");
const { SHUFFLE_DEALING_CONFIG } = require("./config");

/**
 * Generate a cryptographically random integer in [min, max] (inclusive).
 */
function randomInt(min, max) {
    const range = max - min + 1;
    const bytes = crypto.randomBytes(4);
    return min + (bytes.readUInt32BE(0) % range);
}

// ──── RIFFLE SHUFFLE ────────────────────────────
/**
 * Imperfect riffle shuffle mimicking human behavior.
 * - Split deck at 40-60% (imperfect cut)
 * - Interleave in 1-3 card chunks
 * - Mild alternation bias (not strictly alternating halves)
 */
function riffleShuffle(deck) {
    const cards = [...deck];
    const len = cards.length;

    // Imperfect split: 40-60% of the deck
    const splitPoint = randomInt(Math.floor(len * 0.4), Math.floor(len * 0.6));
    let left = cards.slice(0, splitPoint);
    let right = cards.slice(splitPoint);

    const result = [];
    let pickLeft = randomInt(0, 1) === 0; // random starting hand

    while (left.length > 0 || right.length > 0) {
        const source = pickLeft ? left : right;
        const other = pickLeft ? right : left;

        if (source.length === 0) {
            // One half exhausted, dump the rest
            result.push(...other);
            other.length = 0;
            break;
        }

        // Drop a chunk of 1-3 cards from the chosen half
        const chunkSize = Math.min(randomInt(1, 3), source.length);
        result.push(...source.splice(0, chunkSize));

        // Usually alternate, but with ~15% chance stay on same side
        if (randomInt(1, 100) > 15) {
            pickLeft = !pickLeft;
        }
    }

    return result;
}

// ──── HINDU SHUFFLE ─────────────────────────────
/**
 * Hindu shuffle: pull a packet from within the deck and place on top.
 * Repeated 3 times per operation.
 */
function hinduShuffle(deck) {
    let cards = [...deck];
    const len = cards.length;

    for (let i = 0; i < 3; i++) {
        // Pull position: from somewhere in the top 75% of the deck
        const pullStart = randomInt(0, Math.floor(len * 0.25));
        // Packet size: 25-75% of remaining deck from pull position
        const minSize = Math.max(1, Math.floor(len * 0.25));
        const maxSize = Math.min(cards.length - pullStart, Math.floor(len * 0.75));
        const packetSize = randomInt(minSize, Math.max(minSize, maxSize));

        // Extract packet
        const packet = cards.splice(pullStart, packetSize);
        // Place on top
        cards = [...packet, ...cards];
    }

    return cards;
}

// ──── OVERHAND SHUFFLE ──────────────────────────
/**
 * Overhand shuffle: strip small packets from the top and stack.
 * Exactly 3 strips per operation.
 */
function overhandShuffle(deck) {
    let cards = [...deck];
    const len = cards.length;
    const received = [];

    for (let i = 0; i < 3; i++) {
        if (cards.length === 0) break;

        // Strip 15-35% of original deck size from the top
        const minStrip = Math.max(1, Math.floor(len * 0.15));
        const maxStrip = Math.min(cards.length, Math.floor(len * 0.35));
        const stripSize = randomInt(minStrip, Math.max(minStrip, maxStrip));

        const stripped = cards.splice(0, stripSize);
        // Stack on top of received pile (reverses relative order of packets)
        received.unshift(...stripped);
    }

    // Any remaining cards go on top
    if (cards.length > 0) {
        received.unshift(...cards);
    }

    return received;
}

// ──── CUT DECK ──────────────────────────────────
/**
 * Cut the deck at a random position (25-75%).
 * The card at the cut point becomes the LAST card in the new deck
 * (this will be the dealer's last card when dealing).
 *
 * Returns { deck, cutCard }
 */
function cutDeck(deck) {
    const cards = [...deck];
    const len = cards.length;
    const cutIndex = randomInt(Math.floor(len * 0.25), Math.floor(len * 0.75));

    const top = cards.slice(0, cutIndex);
    const bottom = cards.slice(cutIndex);

    // The card at the cut point is bottom[0] — visible to dealer
    const cutCard = bottom[0];

    // Reassemble: bottom goes on top, but cutCard moves to the very end
    const newDeck = [...bottom.slice(1), ...top, cutCard];

    return { deck: newDeck, cutCard };
}

// ──── BATCH PROCESSOR ───────────────────────────
/**
 * Process an array of shuffle operations on the deck, then optionally cut.
 *
 * @param {Array} deck - The unshuffled deck
 * @param {Array} operations - [{ type: "riffle"|"hindu"|"overhand" }, ...]
 * @param {string} dealType - "deal" or "cut-and-deal"
 * @returns {{ deck: Array, cutCard: Object|null }}
 */
function processShuffleBatch(deck, operations, dealType) {
    const shufflers = {
        riffle: riffleShuffle,
        hindu: hinduShuffle,
        overhand: overhandShuffle,
    };

    let current = [...deck];

    for (const op of operations) {
        const fn = shufflers[op.type];
        if (!fn) {
            throw new Error(`Unknown shuffle type: ${op.type}`);
        }
        current = fn(current);
    }

    let cutCard = null;

    if (dealType === "cut-and-deal") {
        const result = cutDeck(current);
        current = result.deck;
        cutCard = result.cutCard;
    }

    return { deck: current, cutCard };
}

// ──── DEAL FROM DEALER ──────────────────────────
/**
 * Deal cards one at a time, starting from the player NEXT to the dealer.
 *
 * @param {Array} deck - The shuffled (and optionally cut) deck
 * @param {Array} seatOrder - Player IDs in clockwise order
 * @param {number} dealerIndex - Index of the dealer in seatOrder
 * @returns {{ hands: Object, dealOrder: Object }}
 *   hands: { playerId: [card, ...] }
 *   dealOrder: { playerId: [card, ...] } — same as hands but in deal receive order
 */
function dealFromDealer(deck, seatOrder, dealerIndex) {
    const numPlayers = seatOrder.length;
    const startIndex = (dealerIndex + 1) % numPlayers;

    const hands = {};
    const dealOrder = {};
    for (const pid of seatOrder) {
        hands[pid] = [];
        dealOrder[pid] = [];
    }

    for (let i = 0; i < deck.length; i++) {
        const playerIndex = (startIndex + i) % numPlayers;
        const playerId = seatOrder[playerIndex];
        hands[playerId].push(deck[i]);
        dealOrder[playerId].push(deck[i]);
    }

    return { hands, dealOrder };
}

module.exports = {
    riffleShuffle,
    hinduShuffle,
    overhandShuffle,
    cutDeck,
    processShuffleBatch,
    dealFromDealer,
};
