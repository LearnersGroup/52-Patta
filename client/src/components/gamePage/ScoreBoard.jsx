import React, { memo, useState, useEffect } from "react";

const SCOREBOARD_DISPLAY_SECONDS = 5;

const ScoreBoard = memo(({
    scores = {},
    teams = {},
    tricks = [],
    phase,
    scoringResult,
    seatOrder = [],
    bidding,
    getName = (pid) => pid?.substring(0, 8),
    nextRoundReady = { readyPlayers: [], totalPlayers: 0 },
    userId,
    isAdmin,
    onQuitGame,
    currentGameNumber,
    totalGames,
}) => {
    const [countdown, setCountdown] = useState(SCOREBOARD_DISPLAY_SECONDS);

    const bidTeamPoints = tricks.reduce((sum, t) => {
        if (teams.bid?.includes(t.winner)) return sum + (t.points || 0);
        return sum;
    }, 0);

    const opposeTeamPoints = tricks.reduce((sum, t) => {
        if (teams.oppose?.includes(t.winner)) return sum + (t.points || 0);
        return sum;
    }, 0);

    const isFinished = phase === "finished" || phase === "scoring";

    // Auto-countdown timer when game is finished
    useEffect(() => {
        if (phase !== "finished") {
            setCountdown(SCOREBOARD_DISPLAY_SECONDS);
            return;
        }

        setCountdown(SCOREBOARD_DISPLAY_SECONDS);
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase]);

    return (
        <div className="scoreboard">
            <div className="score-header">
                <h3>
                    {isFinished ? "Game Over!" : "Scoreboard"}
                    {totalGames > 1 && (
                        <span className="game-counter-inline">
                            {" "}— Game {currentGameNumber} of {totalGames}
                        </span>
                    )}
                </h3>
            </div>
            <div className="score-teams">
                <div className="score-team bid-team">
                    <div className="team-label">Bid Team</div>
                    <div className="team-points">{bidTeamPoints}</div>
                    <div className="team-members">
                        {teams.bid?.length || 0} players
                    </div>
                </div>
                <div className="score-divider">vs</div>
                <div className="score-team oppose-team">
                    <div className="team-label">Opposing Team</div>
                    <div className="team-points">{opposeTeamPoints}</div>
                    <div className="team-members">
                        {teams.oppose?.length || 0} players
                    </div>
                </div>
            </div>

            {isFinished && scoringResult && (
                <div className="final-scores">
                    <div className="result-banner">
                        <div className={`result-status ${scoringResult.bidTeamSuccess ? "success" : "failure"}`}>
                            {scoringResult.bidTeamSuccess
                                ? "Bid Team Wins!"
                                : "Bid Team Failed!"}
                        </div>
                        <div className="result-detail">
                            Bid: {scoringResult.bidAmount} | Scored: {scoringResult.bidTeamPoints}
                        </div>
                    </div>
                    <h4>Player Scores</h4>
                    <div className="score-list">
                        {Object.entries(scoringResult.playerDeltas || {}).map(([pid, delta]) => (
                            <div key={pid} className="score-row">
                                <span className="score-player">
                                    {getName(pid)}
                                </span>
                                <span className={`score-delta ${delta < 0 ? "negative" : "positive"}`}>
                                    {delta > 0 ? "+" : ""}{delta}
                                </span>
                                <span className="score-total">
                                    Total: {scores[pid] || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isFinished && !scoringResult && (
                <div className="final-scores">
                    <h4>Player Scores</h4>
                    <div className="score-list">
                        {Object.entries(scores).map(([pid, score]) => (
                            <div key={pid} className="score-row">
                                <span className="score-player">
                                    {getName(pid)}
                                </span>
                                <span className={`score-value ${score < 0 ? "negative" : ""}`}>
                                    {score}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {phase === "finished" && (
                <div className="next-round-section">
                    <div className="auto-countdown">
                        <div className="countdown-text">
                            {currentGameNumber < totalGames
                                ? `Next game in ${countdown}s...`
                                : `Final results in ${countdown}s...`
                            }
                        </div>
                        <div className="countdown-bar">
                            <div
                                className="countdown-fill"
                                style={{
                                    width: `${(countdown / SCOREBOARD_DISPLAY_SECONDS) * 100}%`,
                                    transition: "width 1s linear",
                                }}
                            />
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="next-round-buttons">
                            <button
                                className="btn-danger btn-sm"
                                onClick={onQuitGame}
                            >
                                Quit Game
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

ScoreBoard.displayName = "ScoreBoard";

export default ScoreBoard;
