import { useSelector } from "react-redux";
import { suitSymbol, isRedSuit } from "./utils/cardMapper";

/**
 * JudgementScoreboardModal — full-series overlay for Judgement mode.
 *
 * Opens as a fixed overlay; shows:
 *  - One column per player, one row per completed round
 *  - Bid / Won / Delta per cell
 *  - Live current-round tricks-won row (if in playing phase)
 *  - Total score row at footer
 */
const JudgementScoreboardModal = ({ onClose }) => {
    const {
        seatOrder,
        playerNames,
        roundResults,
        scores,
        tricksWon,
        bidding,
        trumpSuit,
        seriesRoundIndex,
        totalRoundsInSeries,
        phase,
    } = useSelector((s) => s.game);

    const getName = (pid) => playerNames?.[pid] || pid?.substring(0, 8) || "?";
    const isPlaying = phase === "playing";

    // Sort by total score descending for the leading crown
    const sorted = [...(seatOrder || [])].sort(
        (a, b) => (scores[b] || 0) - (scores[a] || 0)
    );
    const leader = sorted[0];

    return (
        <div className="ssb-overlay" onClick={onClose}>
            <div className="ssb-panel jdg-ssb-panel" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="ssb-header">
                    <div className="ssb-title-group">
                        <h2 className="ssb-title">Scoreboard</h2>
                        <span className="ssb-series-badge">
                            Round {(seriesRoundIndex || 0) + 1} of {totalRoundsInSeries || 1}
                        </span>
                        {trumpSuit && (
                            <span className={`jdg-ssb-trump ${isRedSuit(trumpSuit) ? "red" : "black"}`}>
                                {suitSymbol(trumpSuit)} Trump
                            </span>
                        )}
                    </div>
                    <button className="ssb-close-btn" onClick={onClose} aria-label="Close scoreboard">✕</button>
                </div>

                {/* Table */}
                <div className="ssb-table-wrap">
                    <table className="judgement-score-table jdg-ssb-table">
                        <thead>
                            <tr>
                                <th className="jst-round-col">Rnd</th>
                                {(seatOrder || []).map((pid) => (
                                    <th key={pid} className={`jst-player-col ${pid === leader ? "jdg-ssb-leader-col" : ""}`}>
                                        {pid === leader && <span className="ssb-rank-crown">♛ </span>}
                                        {getName(pid)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(roundResults || []).map((rr) => (
                                <tr key={rr.roundNumber}>
                                    <td className="jst-round-label">{rr.roundNumber}</td>
                                    {(seatOrder || []).map((pid) => {
                                        const bid   = rr.bids?.[pid] ?? 0;
                                        const won   = rr.tricksWon?.[pid] ?? 0;
                                        const delta = rr.deltas?.[pid] ?? 0;
                                        const hit   = won === bid;
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

                            {/* Live current round row */}
                            {isPlaying && (
                                <tr className="jdg-ssb-live-row">
                                    <td className="jst-round-label jdg-ssb-live-label">
                                        <span className="ssb-live-badge">Live</span>
                                    </td>
                                    {(seatOrder || []).map((pid) => {
                                        const won = tricksWon?.[pid] || 0;
                                        const bid = bidding?.bids?.[pid] ?? "?";
                                        return (
                                            <td key={pid} className="jst-cell ssb-live">
                                                <span className="jst-won-bid">{won}/{bid}</span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="jst-round-label">Total</td>
                                {(seatOrder || []).map((pid) => (
                                    <td key={pid} className="jst-total-cell">
                                        <strong>{scores?.[pid] || 0}</strong>
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="ssb-footer">
                    <span className="ssb-footer-note">
                        {isPlaying
                            ? "Live row shows current-round tricks won / bid"
                            : "Scores update at end of each round"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default JudgementScoreboardModal;
