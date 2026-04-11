function getTeamForPlayer(playerId, teams) {
    if ((teams?.A || []).includes(playerId)) return "A";
    if ((teams?.B || []).includes(playerId)) return "B";
    return null;
}

function computeNextDealer(seatOrder, currentDealerId, teams, roundOutcome) {
    const dealerIndex = seatOrder.indexOf(currentDealerId);
    if (dealerIndex === -1) {
        return seatOrder[0] || null;
    }

    const dealerTeam = getTeamForPlayer(currentDealerId, teams);
    const winningTeam = roundOutcome?.winningTeam || null;

    if (!dealerTeam || !winningTeam || dealerTeam === winningTeam) {
        // Winning-team scenario (or fallback): one seat clockwise.
        return seatOrder[(dealerIndex + 1) % seatOrder.length];
    }

    // Losing-team scenario: dealer's next teammate clockwise.
    return seatOrder[(dealerIndex + 2) % seatOrder.length];
}

module.exports = {
    computeNextDealer,
};
