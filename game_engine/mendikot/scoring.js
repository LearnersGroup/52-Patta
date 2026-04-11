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

module.exports = {
    classifyRoundResult,
    firstToNTricksWinner,
};
