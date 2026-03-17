import { memo, useState, useEffect } from "react";

const JudgementScoreBoard = memo(({
    seatOrder = [],
    roundResults = [],
    scores = {},
    getName = (pid) => pid?.substring(0, 8),
    trumpCard,
    trumpSuit,
    phase,
    nextRoundReady = { readyPlayers: [], totalPlayers: 0 },
    userId,
    scoreboardTimeMs = 5000,
    seriesRoundIndex = 0,
    totalRoundsInSeries = 1,
}) => {
    const scoreboardSecs = Math.round(scoreboardTimeMs / 1000);
    const [countdown, setCountdown] = useState(scoreboardSecs);
    const isFinished = phase === "finished";

    useEffect(() => {
        if (!isFinished) { setCountdown(scoreboardSecs); return; }
        setCountdown(scoreboardSecs);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [phase, scoreboardSecs]); // eslint-disable-line

    const trumpDisplay = trumpCard
        ? `${trumpCard.rank}${trumpCard.suit}`
        : trumpSuit
        ? `(${trumpSuit})`
        : "None";

    return (
        <div className="scoreboard judgement-scoreboard">
            <div className="score-header">
                <h3>Round {seriesRoundIndex + 1} of {totalRoundsInSeries} — Trump: {trumpDisplay}</h3>
            </div>

            <div className="judgement-table-wrap">
                <table className="judgement-score-table">
                    <thead>
                        <tr>
                            <th className="jst-round-col">Round</th>
                            {seatOrder.map(pid => (
                                <th key={pid} className={`jst-player-col ${pid === userId ? "jst-me" : ""}`}>
                                    {getName(pid)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {roundResults.map(rr => (
                            <tr key={rr.roundNumber}>
                                <td className="jst-round-label">{rr.roundNumber}</td>
                                {seatOrder.map(pid => {
                                    const bid = rr.bids?.[pid] ?? 0;
                                    const won = rr.tricksWon?.[pid] ?? 0;
                                    const delta = rr.deltas?.[pid] ?? 0;
                                    const hit = won === bid;
                                    return (
                                        <td key={pid} className={`jst-cell ${hit ? "jst-hit" : "jst-miss"}`}>
                                            <span className="jst-won-bid">{won}/{bid}</span>
                                            <span className={`jst-delta ${delta > 0 ? "jst-delta-pos" : "jst-delta-zero"}`}>
                                                {delta > 0 ? `+${delta}` : "✗"}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="jst-total-row">
                            <td className="jst-round-label">Total</td>
                            {seatOrder.map(pid => (
                                <td key={pid} className="jst-total-cell">
                                    <strong>{scores[pid] || 0}</strong>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {isFinished && (
                <div className="next-round-section">
                    <div className="auto-countdown">
                        <div className="countdown-text">
                            Next round in {countdown}s...
                        </div>
                        <div className="countdown-bar">
                            <div
                                className="countdown-fill"
                                style={{
                                    width: `${(countdown / scoreboardSecs) * 100}%`,
                                    transition: "width 1s linear",
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

JudgementScoreBoard.displayName = "JudgementScoreBoard";
export default JudgementScoreBoard;
