function dealJudgementRound(shuffledDeck, seatOrder, cardsPerRound, dealerIndex) {
    const hands = {};
    seatOrder.forEach((pid) => {
        hands[pid] = [];
    });

    const playerCount = seatOrder.length;
    const startIndex = (dealerIndex + 1) % playerCount;
    const totalToDeal = cardsPerRound * playerCount;

    for (let i = 0; i < totalToDeal && i < shuffledDeck.length; i += 1) {
        const pid = seatOrder[(startIndex + i) % playerCount];
        hands[pid].push(shuffledDeck[i]);
    }

    const trumpIndex = totalToDeal < shuffledDeck.length ? totalToDeal : null;
    const trumpCard = trumpIndex === null ? null : shuffledDeck[trumpIndex];
    const trumpSuit = trumpCard?.suit || null;

    return {
        hands,
        trumpCard,
        trumpSuit,
    };
}

function getNextJudgementRound(gameState) {
    const nextIndex = (gameState.seriesRoundIndex || 0) + 1;
    const sequence = gameState.config?.roundSequence || [];

    if (nextIndex >= sequence.length) {
        return { done: true };
    }

    return {
        done: false,
        seriesRoundIndex: nextIndex,
        cardsPerRound: sequence[nextIndex],
    };
}

module.exports = {
    dealJudgementRound,
    getNextJudgementRound,
};
