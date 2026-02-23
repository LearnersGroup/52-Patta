const { getCardPoints } = require("./config");

/**
 * Calculate points earned by each team from completed tricks.
 */
function sumPointsForTeam(tricks, teamPlayerIds) {
    let total = 0;
    for (const trick of tricks) {
        if (teamPlayerIds.includes(trick.winner)) {
            total += trick.points;
        }
    }
    return total;
}

/**
 * Calculate the game result: point deltas for each player.
 *
 * Scoring rules (designed to be swappable in the future):
 *
 * Bid Winner's Team:
 *   - Must score higher than the bid amount
 *   - Success: each member gets the points the team scored
 *   - Failure: bid winner loses the bid amount (can go negative);
 *     other team members get half the opposing team's points
 *
 * Opposing Team:
 *   - Each player gets their team's points
 *   - No minimum, no risk
 */
function calculateGameResult(gameState) {
    const { teams, tricks, bidding, leader } = gameState;
    const bidTeam = teams.bid;
    const opposeTeam = teams.oppose;
    const bidAmount = bidding.currentBid;

    const bidTeamPoints = sumPointsForTeam(tricks, bidTeam);
    const opposeTeamPoints = sumPointsForTeam(tricks, opposeTeam);

    const result = {
        bidTeamPoints,
        opposeTeamPoints,
        bidAmount,
        bidTeamSuccess: bidTeamPoints > bidAmount,
        playerDeltas: {},
    };

    if (result.bidTeamSuccess) {
        // Bid team succeeds: each member gets team's points
        for (const playerId of bidTeam) {
            result.playerDeltas[playerId] = bidTeamPoints;
        }
    } else {
        // Bid team fails:
        // - Leader loses the bid amount (can go negative)
        // - Other bid team members get half of opposing team's points
        for (const playerId of bidTeam) {
            if (playerId === leader) {
                result.playerDeltas[playerId] = -bidAmount;
            } else {
                result.playerDeltas[playerId] = Math.floor(opposeTeamPoints / 2);
            }
        }
    }

    // Opposing team: each gets their team's points
    for (const playerId of opposeTeam) {
        result.playerDeltas[playerId] = opposeTeamPoints;
    }

    return result;
}

/**
 * Apply scoring result to cumulative scores.
 * Returns new scores object.
 */
function applyScoring(currentScores, result) {
    const newScores = { ...currentScores };
    for (const [playerId, delta] of Object.entries(result.playerDeltas)) {
        newScores[playerId] = (newScores[playerId] || 0) + delta;
    }
    return newScores;
}

module.exports = {
    sumPointsForTeam,
    calculateGameResult,
    applyScoring,
};
