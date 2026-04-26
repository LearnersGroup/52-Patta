function countTeamTricks(tricks, teamPlayers) {
    const set = new Set(teamPlayers || []);
    return (tricks || []).reduce((acc, t) => acc + (set.has(t.winner) ? 1 : 0), 0);
}

function firstToNTricksWinner(tricks, teams, n) {
    if (!n || n <= 0) return null;

    const teamA = new Set(teams?.A || []);
    const teamB = new Set(teams?.B || []);
    let a = 0;
    let b = 0;

    for (const t of tricks || []) {
        if (teamA.has(t.winner)) a += 1;
        if (teamB.has(t.winner)) b += 1;
        if (a >= n) return "A";
        if (b >= n) return "B";
    }

    return null;
}

function classifyRoundResult(state) {
    const decks = state.config?.decks || 1;
    const allTens = decks === 2 ? 8 : 4;
    const mendiThreshold = decks === 2 ? 5 : 3;

    const teamATens = state.tens_by_team?.A || 0;
    const teamBTens = state.tens_by_team?.B || 0;
    const teamATricks = state.tricks_by_team?.A ?? countTeamTricks(state.tricks, state.teams?.A);
    const teamBTricks = state.tricks_by_team?.B ?? countTeamTricks(state.tricks, state.teams?.B);
    const totalTricks = (state.tricks || []).length;

    if (teamATens === allTens && teamATricks === totalTricks) {
        return { type: "52-card mendikot", winningTeam: "A" };
    }
    if (teamBTens === allTens && teamBTricks === totalTricks) {
        return { type: "52-card mendikot", winningTeam: "B" };
    }

    if (teamATens === allTens) {
        return { type: "mendikot", winningTeam: "A" };
    }
    if (teamBTens === allTens) {
        return { type: "mendikot", winningTeam: "B" };
    }

    if (teamATens >= mendiThreshold && teamATens > teamBTens) {
        return { type: "win-by-mendi", winningTeam: "A" };
    }
    if (teamBTens >= mendiThreshold && teamBTens > teamATens) {
        return { type: "win-by-mendi", winningTeam: "B" };
    }

    // win-by-tricks bucket (includes split-tens scenario + any residual case)
    if (teamATricks > teamBTricks) {
        return { type: "win-by-tricks", winningTeam: "A" };
    }
    if (teamBTricks > teamATricks) {
        return { type: "win-by-tricks", winningTeam: "B" };
    }

    const n = teamATricks;
    const first = state.first_to_n_tricks || firstToNTricksWinner(state.tricks, state.teams, n);
    if (first) {
        return { type: "win-by-tricks", winningTeam: first };
    }

    return { type: "win-by-tricks", winningTeam: "A" };
}

// Returns 'A', 'B', or null (draw) using the series tiebreaker chain.
function determineSeriesWinner(sessionTotals, roundResults) {
    const totalsA = sessionTotals?.A || {};
    const totalsB = sessionTotals?.B || {};

    // 1. Most 52-card mendikots
    const a52 = totalsA['52-card mendikot'] || 0;
    const b52 = totalsB['52-card mendikot'] || 0;
    if (a52 !== b52) return a52 > b52 ? 'A' : 'B';

    // 2. Most mendikots
    const aMendi = totalsA['mendikot'] || 0;
    const bMendi = totalsB['mendikot'] || 0;
    if (aMendi !== bMendi) return aMendi > bMendi ? 'A' : 'B';

    // 3. Total tens collected across all rounds
    const rounds = roundResults || [];
    const aTens = rounds.reduce((sum, r) => sum + (r.tens_by_team?.A || 0), 0);
    const bTens = rounds.reduce((sum, r) => sum + (r.tens_by_team?.B || 0), 0);
    if (aTens !== bTens) return aTens > bTens ? 'A' : 'B';

    // 4. Most rounds won
    const ALL_TYPES = ['win-by-tricks', 'win-by-mendi', 'mendikot', '52-card mendikot'];
    const aRounds = ALL_TYPES.reduce((sum, t) => sum + (totalsA[t] || 0), 0);
    const bRounds = ALL_TYPES.reduce((sum, t) => sum + (totalsB[t] || 0), 0);
    if (aRounds !== bRounds) return aRounds > bRounds ? 'A' : 'B';

    // 5. Total tricks collected across all rounds
    const aTricks = rounds.reduce((sum, r) => sum + (r.tricks_by_team?.A || 0), 0);
    const bTricks = rounds.reduce((sum, r) => sum + (r.tricks_by_team?.B || 0), 0);
    if (aTricks !== bTricks) return aTricks > bTricks ? 'A' : 'B';

    // 6. Draw
    return null;
}

module.exports = {
    classifyRoundResult,
    firstToNTricksWinner,
    determineSeriesWinner,
};
