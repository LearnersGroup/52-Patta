function calculateJudgementRoundResult(bids, tricksWon) {
    const deltas = {};

    for (const [playerId, bid] of Object.entries(bids || {})) {
        const tricks = tricksWon?.[playerId] || 0;
        deltas[playerId] = tricks === bid ? 10 + bid : 0;
    }

    return deltas;
}

function applyJudgementScoring(scores, roundResult) {
    const nextScores = { ...(scores || {}) };
    for (const [playerId, delta] of Object.entries(roundResult || {})) {
        nextScores[playerId] = (nextScores[playerId] || 0) + delta;
    }
    return nextScores;
}

module.exports = {
    calculateJudgementRoundResult,
    applyJudgementScoring,
};
