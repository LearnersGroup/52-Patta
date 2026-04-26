function validateJudgementConfig(playerCount, deckCount) {
    if (playerCount < 3 || playerCount > 13) {
        throw new Error(`Player count must be between 3 and 13 (got ${playerCount})`);
    }

    if (deckCount !== 1 && deckCount !== 2) {
        throw new Error(`Deck count must be 1 or 2 (got ${deckCount})`);
    }

    if (deckCount === 1 && playerCount > 6) {
        throw new Error("For Judgement, 1 deck supports up to 6 players. Use 2 decks for 7+ players.");
    }


}

function computeJudgementConfig(playerCount, deckCount, maxCardsPerRound = null, reverseOrder = false, trumpMode = "random", scoreboardTime = null, bidTime = null, cardRevealTime = null) {
    validateJudgementConfig(playerCount, deckCount);

    const maxPossible = Math.floor((52 * deckCount) / playerCount);
    if (maxPossible < 1) {
        throw new Error("Invalid Judgement configuration: no cards can be dealt per player");
    }

    const requestedMax = maxCardsPerRound == null ? maxPossible : Number(maxCardsPerRound);
    if (!Number.isInteger(requestedMax) || requestedMax < 1 || requestedMax > maxPossible) {
        throw new Error(`max_cards_per_round must be an integer between 1 and ${maxPossible}`);
    }

    const ascending = Array.from({ length: requestedMax }, (_, i) => i + 1);
    const descending = reverseOrder && requestedMax > 1
        ? Array.from({ length: requestedMax - 1 }, (_, i) => requestedMax - 1 - i)
        : [];
    const roundSequence = [...ascending, ...descending];

    return {
        players: playerCount,
        decks: deckCount,
        maxCardsPerRound: requestedMax,
        reverseOrder: !!reverseOrder,
        roundSequence,
        totalRounds: roundSequence.length,
        trumpMode: trumpMode === "fixed" ? "fixed" : "random",
        scoreboardTimeMs: scoreboardTime ? scoreboardTime * 1000 : 5000,
        bidTimeMs: bidTime ? bidTime * 1000 : null,
        cardRevealTimeMs: cardRevealTime ? cardRevealTime * 1000 : 10000,
    };
}

module.exports = {
    computeJudgementConfig,
};
