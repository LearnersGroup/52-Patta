const MATRIX = {
    4: {
        1: { cardsPerPlayer: 13, removeTwos: 0 },
        2: { cardsPerPlayer: 26, removeTwos: 0 },
    },
    6: {
        1: { cardsPerPlayer: 8, removeTwos: 4 },
        2: { cardsPerPlayer: 17, removeTwos: 2 },
    },
    8: {
        1: { cardsPerPlayer: 6, removeTwos: 4 },
        2: { cardsPerPlayer: 13, removeTwos: 0 },
    },
    10: {
        1: { cardsPerPlayer: 5, removeTwos: 2 },
        2: { cardsPerPlayer: 10, removeTwos: 4 },
    },
    12: {
        1: { cardsPerPlayer: 4, removeTwos: 4 },
        2: { cardsPerPlayer: 8, removeTwos: 8 },
    },
};

function validateMendikotConfig(playerCount, deckCount) {
    const row = MATRIX[playerCount];
    if (!row || !row[deckCount]) {
        throw new Error("Mendikot supports players {4,6,8,10,12} with deck_count 1 or 2");
    }
}

function computeMendikotConfig(
    playerCount,
    deckCount,
    trumpMode = "band",
    bandHukumPickPhase = true,
    roundsCount = 5,
    cardRevealTime = null
) {
    validateMendikotConfig(playerCount, deckCount);

    if (trumpMode !== "band" && trumpMode !== "cut") {
        throw new Error("Mendikot trump_mode must be 'band' or 'cut'");
    }

    const rounds = Number(roundsCount);
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) {
        throw new Error("Mendikot rounds_count must be an integer between 1 and 20");
    }

    const row = MATRIX[playerCount][deckCount];
    const totalCards = (52 * deckCount) - row.removeTwos;

    return {
        key: `mendikot-${playerCount}P-${deckCount}D`,
        players: playerCount,
        decks: deckCount,
        totalCards,
        removeTwos: row.removeTwos,
        cardsPerPlayer: row.cardsPerPlayer,
        rounds: row.cardsPerPlayer,
        playDirection: "clockwise",
        trump_mode: trumpMode,
        band_hukum_pick_phase: !!bandHukumPickPhase,
        rounds_count: rounds,
        cardRevealTimeMs: cardRevealTime ? cardRevealTime * 1000 : 10000,
    };
}

module.exports = {
    MATRIX,
    validateMendikotConfig,
    computeMendikotConfig,
};
