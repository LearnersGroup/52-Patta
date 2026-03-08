/**
 * Dynamic game configuration for KaliTiri.
 *
 * Supports 4–13 players with 1 or 2 decks.
 * Config is computed on-the-fly from playerCount + deckCount rather than a fixed table,
 * so any valid combination is supported automatically.
 *
 * Rules:
 *  - 1 deck = 52 cards, max 4 twos can be removed
 *  - 2 decks = 104 cards, max 8 twos can be removed
 *  - Invalid if (baseCards % players) > maxTwos
 *    (currently only 9P1D and 11P1D are invalid)
 *
 * Bid scale:
 *  - 1 deck: bidStart=150, bidMax=250, maxPoints=250
 *  - 2 decks: bidStart=300, bidMax=500, maxPoints=500
 *
 * Teams:
 *  - Even players: bid = N/2, oppose = N/2 (no advantage threshold)
 *  - Odd players:  bid = floor(N/2), oppose = ceil(N/2) by default
 *                  if bid >= bidThreshold → bid = ceil(N/2), oppose = floor(N/2)
 */

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_ORDER = Object.fromEntries(RANKS.map((r, i) => [r, i]));

/**
 * Check whether a (playerCount, deckCount) combination is valid.
 * Returns { valid, removeTwos } on success, { valid: false, reason } on failure.
 */
function checkConfig(playerCount, deckCount) {
    const N = playerCount;
    const D = deckCount;
    if (N < 4 || N > 13) return { valid: false, reason: `Player count must be 4–13 (got ${N})` };
    if (D !== 1 && D !== 2) return { valid: false, reason: `Deck count must be 1 or 2 (got ${D})` };

    const baseCards = 52 * D;
    const maxTwos = 4 * D;
    const removeTwos = baseCards % N;

    if (removeTwos > maxTwos) {
        return {
            valid: false,
            reason: `${N} players with ${D} deck${D > 1 ? "s" : ""} would need ${removeTwos} twos removed but only ${maxTwos} are available. Try 2 decks.`,
        };
    }
    return { valid: true, removeTwos };
}

/**
 * Compute game configuration dynamically from playerCount + deckCount.
 * Throws an error if the combination is invalid.
 */
function computeConfig(playerCount, deckCount) {
    const N = playerCount;
    const D = deckCount;

    const check = checkConfig(N, D);
    if (!check.valid) throw new Error(check.reason);

    const baseCards = 52 * D;
    const removeTwos = check.removeTwos;
    const totalCards = baseCards - removeTwos;
    const cardsPerPlayer = totalCards / N;

    // Bid scale
    const bidStart = D === 1 ? 150 : 300;
    const bidMax = D === 1 ? 250 : 500;
    const maxPoints = bidMax;
    const bidIncrement = 5;

    // Teams
    const isOdd = N % 2 === 1;
    const bidTeamDefault = Math.floor(N / 2);
    const opposeTeamDefault = Math.ceil(N / 2);
    const defaultTeams = { bid: bidTeamDefault, oppose: opposeTeamDefault };
    const advantageTeams = isOdd ? { bid: opposeTeamDefault, oppose: bidTeamDefault } : null;

    // Partner cards = bid team size − 1 (leader plays their own partner card)
    const partnerCards = bidTeamDefault - 1;

    // Bid threshold: midpoint of bidStart..bidMax, rounded to nearest 5 (odd players only)
    const rawThreshold = (bidStart + bidMax) / 2;
    const bidThreshold = isOdd ? Math.round(rawThreshold / 5) * 5 : null;

    const key = `${N}P${D}D`;

    return {
        key,
        players: N,
        decks: D,
        totalCards,
        removeTwos,
        cardsPerPlayer,
        rounds: cardsPerPlayer,
        defaultTeams,
        advantageTeams,
        partnerCards,
        maxPoints,
        bidStart,
        bidMax,
        bidIncrement,
        bidThreshold,
    };
}

/**
 * Get config by player count and deck count.
 * deckCount defaults to 1 for ≤5 players and 2 for ≥6 players if not provided.
 * (Kept for backward compatibility — internally uses computeConfig.)
 */
function getConfig(playerCount, deckCount) {
    const dc = deckCount || (playerCount <= 5 ? 1 : 2);
    return computeConfig(playerCount, dc);
}

/**
 * Get the point value of a card.
 */
function getCardPoints(card) {
    if (card.suit === "S" && card.rank === "3") return 30; // KaliTiri
    if (["10", "J", "Q", "K", "A"].includes(card.rank)) return 10;
    if (card.rank === "5") return 5;
    return 0;
}

/**
 * Compare two ranks. Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareRanks(rankA, rankB) {
    return RANK_ORDER[rankA] - RANK_ORDER[rankB];
}

const SHUFFLE_DEALING_CONFIG = {
    MAX_SHUFFLE_OPS: 5,
    CUT_CARD_REVEAL_MS: 1500,
    DEALING_ANIMATION_MS: 5000,
    SCOREBOARD_DISPLAY_MS: 5000,
    SHUFFLE_TYPES: ["riffle", "hindu", "overhand"],
    // Non-sequential bidding timing
    BIDDING_REVEAL_MS: 7500,   // how long the card-reveal overlay stays before bidding opens
    BIDDING_WINDOW_MS: 15000,  // bidding window duration (resets on every new bid)
};

module.exports = {
    SUITS,
    RANKS,
    RANK_ORDER,
    SHUFFLE_DEALING_CONFIG,
    checkConfig,
    computeConfig,
    getConfig,
    getCardPoints,
    compareRanks,
};
