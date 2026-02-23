/**
 * Game configuration table for all KaliTiri variants.
 *
 * One Deck: 4-6 players (250 max points)
 * Two Decks: 6-10 players (500 max points)
 *
 * For 6 players, both 1D and 2D are valid — room creator chooses.
 * Odd-player configs have a bidThreshold: if bid >= threshold,
 * the bidder earns an extra teammate (flipping team advantage).
 */

const GAME_CONFIGS = {
    "4P1D": {
        players: 4,
        decks: 1,
        totalCards: 52,
        removeTwos: 0,
        cardsPerPlayer: 13,
        rounds: 13,
        defaultTeams: { bid: 2, oppose: 2 },
        advantageTeams: null,
        partnerCards: 1,
        maxPoints: 250,
        bidStart: 150,
        bidMax: 250,
        bidIncrement: 5,
        bidThreshold: null,
    },
    "5P1D": {
        players: 5,
        decks: 1,
        totalCards: 50,
        removeTwos: 2,
        cardsPerPlayer: 10,
        rounds: 10,
        defaultTeams: { bid: 2, oppose: 3 },
        advantageTeams: { bid: 3, oppose: 2 },
        partnerCards: 1,
        maxPoints: 250,
        bidStart: 150,
        bidMax: 250,
        bidIncrement: 5,
        bidThreshold: 200, // default, can be overridden by room creator
    },
    "6P1D": {
        players: 6,
        decks: 1,
        totalCards: 48,
        removeTwos: 4,
        cardsPerPlayer: 8,
        rounds: 8,
        defaultTeams: { bid: 3, oppose: 3 },
        advantageTeams: null,
        partnerCards: 2,
        maxPoints: 250,
        bidStart: 150,
        bidMax: 250,
        bidIncrement: 5,
        bidThreshold: null,
    },
    "6P2D": {
        players: 6,
        decks: 2,
        totalCards: 102,
        removeTwos: 2,
        cardsPerPlayer: 17,
        rounds: 17,
        defaultTeams: { bid: 3, oppose: 3 },
        advantageTeams: null,
        partnerCards: 2,
        maxPoints: 500,
        bidStart: 300,
        bidMax: 500,
        bidIncrement: 5,
        bidThreshold: null,
    },
    "7P2D": {
        players: 7,
        decks: 2,
        totalCards: 98,
        removeTwos: 6,
        cardsPerPlayer: 14,
        rounds: 14,
        defaultTeams: { bid: 3, oppose: 4 },
        advantageTeams: { bid: 4, oppose: 3 },
        partnerCards: 2,
        maxPoints: 500,
        bidStart: 300,
        bidMax: 500,
        bidIncrement: 5,
        bidThreshold: 400,
    },
    "8P2D": {
        players: 8,
        decks: 2,
        totalCards: 104,
        removeTwos: 0,
        cardsPerPlayer: 13,
        rounds: 13,
        defaultTeams: { bid: 4, oppose: 4 },
        advantageTeams: null,
        partnerCards: 3,
        maxPoints: 500,
        bidStart: 300,
        bidMax: 500,
        bidIncrement: 5,
        bidThreshold: null,
    },
    "9P2D": {
        players: 9,
        decks: 2,
        totalCards: 99,
        removeTwos: 5,
        cardsPerPlayer: 11,
        rounds: 11,
        defaultTeams: { bid: 4, oppose: 5 },
        advantageTeams: { bid: 5, oppose: 4 },
        partnerCards: 3,
        maxPoints: 500,
        bidStart: 300,
        bidMax: 500,
        bidIncrement: 5,
        bidThreshold: 400,
    },
    "10P2D": {
        players: 10,
        decks: 2,
        totalCards: 100,
        removeTwos: 8,
        cardsPerPlayer: 10,
        rounds: 10,
        defaultTeams: { bid: 5, oppose: 5 },
        advantageTeams: null,
        partnerCards: 4,
        maxPoints: 500,
        bidStart: 300,
        bidMax: 500,
        bidIncrement: 5,
        bidThreshold: null,
    },
};

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_ORDER = Object.fromEntries(RANKS.map((r, i) => [r, i]));

/**
 * Look up config by player count and deck count.
 * For 6 players, deckCount is required (1 or 2).
 */
function getConfig(playerCount, deckCount) {
    if (playerCount === 6 && !deckCount) {
        throw new Error("6-player games require deckCount to be specified (1 or 2)");
    }

    const dc = deckCount || (playerCount <= 5 ? 1 : 2);
    const key = `${playerCount}P${dc}D`;
    const config = GAME_CONFIGS[key];

    if (!config) {
        throw new Error(`No config found for ${key}`);
    }

    return { ...config, key };
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

module.exports = {
    GAME_CONFIGS,
    SUITS,
    RANKS,
    RANK_ORDER,
    getConfig,
    getCardPoints,
    compareRanks,
};
