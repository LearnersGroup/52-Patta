import { memo } from "react";
import { suitSymbol, isRedSuit } from "./utils/cardMapper";

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
    seriesRoundIndex = 0,
    totalRoundsInSeries = 1,
}) => {
    const displaySuit = trumpCard?.suit || trumpSuit;

    return (
        <div className="judgement-scoreboard">
            <div className="jdg-score-header">
                <h3 className="jdg-score-title">
                    Round {seriesRoundIndex + 1} of {totalRoundsInSeries}
                </h3>
                {displaySuit && (
                    <div className="jdg-trump-badge-inline">
                        <span className={`jdg-trump-suit-sym ${isRedSuit(displaySuit) ? "red" : "black"}`}>
                            {suitSymbol(displaySuit)}
                        </span>
                        <span className="jdg-trump-suit-label">Trump</span>
                    </div>
                )}
            </div>

            <div className="judgement-table-wrap">
                <table className="judgement-score-table">
                    <thead>
                        <tr>
                            <th className="jst-round-col">Rnd</th>
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
                                        <td key={pid} className={`jst-cell ${hit ? "jst-hit" : "jst-miss"} ${pid === userId ? "jst-me" : ""}`}>
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
                        <tr>
                            <td className="jst-round-label">Total</td>
                            {seatOrder.map(pid => (
                                <td key={pid} className={`jst-total-cell ${pid === userId ? "jst-me" : ""}`}>
                                    <strong>{scores[pid] || 0}</strong>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>

        </div>
    );
});

JudgementScoreBoard.displayName = "JudgementScoreBoard";
export default JudgementScoreBoard;
