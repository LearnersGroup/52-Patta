import { useSelector } from "react-redux";

/**
 * ScoreboardModal — full-series score overlay.
 *
 * Shows a per-game breakdown for every player plus their cumulative total.
 * Opens as a fixed overlay on top of the game table.
 *
 * Data sources:
 *  - game.gameHistory  → client-accumulated per-game deltas (from scoringResult events)
 *  - game.scores       → server-authoritative cumulative totals
 *  - game.tricks       → live trick points for the current in-progress game
 */
const ScoreboardModal = ({ onClose }) => {
    const {
        seatOrder,
        playerNames,
        gameHistory,
        scores,
        tricks,
        currentGameNumber,
        totalGames,
    } = useSelector((s) => s.game);

    const getName = (pid) => playerNames[pid] || pid?.substring(0, 8) || "?";

    // Live trick points for the current game (may be 0 during non-playing phases)
    const liveTrickPts = {};
    (tricks || []).forEach((t) => {
        if (t.winner) {
            liveTrickPts[t.winner] = (liveTrickPts[t.winner] || 0) + (t.points || 0);
        }
    });

    const noCompletedGames = gameHistory.length === 0;
    const isSeries = totalGames > 1;

    // Column headers: one per completed game + current game if in progress
    const gameColumns = Array.from(
        { length: currentGameNumber },
        (_, i) => i + 1
    );

    // Sort players by total score descending
    const sortedPlayers = [...seatOrder].sort(
        (a, b) => (scores[b] || 0) - (scores[a] || 0)
    );

    return (
        <div className="ssb-overlay" onClick={onClose}>
            <div className="ssb-panel" onClick={(e) => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="ssb-header">
                    <div className="ssb-title-group">
                        <h2 className="ssb-title">Scoreboard</h2>
                        {isSeries && (
                            <span className="ssb-series-badge">
                                Game {currentGameNumber} of {totalGames}
                            </span>
                        )}
                    </div>
                    <button className="ssb-close-btn" onClick={onClose} aria-label="Close scoreboard">
                        ✕
                    </button>
                </div>

                {/* ── First game, no history yet ── */}
                {noCompletedGames ? (
                    <div className="ssb-empty">
                        <div className="ssb-empty-icon">🃏</div>
                        <div className="ssb-empty-text">
                            {isSeries
                                ? `Game 1 of ${totalGames} is being played`
                                : "First game is being played"}
                        </div>
                        <div className="ssb-empty-sub">
                            Scores will appear here once the first game is complete
                        </div>
                    </div>
                ) : (
                    /* ── Score table ── */
                    <div className="ssb-table-wrap">
                        <table className="ssb-table">
                            <thead>
                                <tr>
                                    <th className="ssb-th ssb-th-player">Player</th>
                                    {isSeries && gameColumns.map((g) => (
                                        <th key={g} className="ssb-th ssb-th-game">
                                            {g === currentGameNumber &&
                                            !gameHistory.find((h) => h.gameNumber === g)
                                                ? <span className="ssb-live-badge">G{g}</span>
                                                : `G${g}`
                                            }
                                        </th>
                                    ))}
                                    <th className="ssb-th ssb-th-total">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((pid, rank) => {
                                    const total = scores[pid] || 0;
                                    return (
                                        <tr key={pid} className={rank === 0 ? "ssb-row-leader" : "ssb-row"}>
                                            <td className="ssb-td ssb-td-player">
                                                {rank === 0 && <span className="ssb-rank-crown">♛</span>}
                                                {getName(pid)}
                                            </td>

                                            {isSeries && gameColumns.map((g) => {
                                                const hist = gameHistory.find((h) => h.gameNumber === g);
                                                if (hist) {
                                                    const delta = hist.playerDeltas[pid] ?? 0;
                                                    return (
                                                        <td key={g} className={`ssb-td ssb-td-game ${delta >= 0 ? "ssb-pos" : "ssb-neg"}`}>
                                                            {delta > 0 ? "+" : ""}{delta}
                                                        </td>
                                                    );
                                                }
                                                // Current in-progress game — show live trick pts
                                                if (g === currentGameNumber) {
                                                    const live = liveTrickPts[pid] || 0;
                                                    return (
                                                        <td key={g} className="ssb-td ssb-td-game ssb-live">
                                                            ~{live}
                                                        </td>
                                                    );
                                                }
                                                return <td key={g} className="ssb-td ssb-td-game ssb-dash">—</td>;
                                            })}

                                            <td className="ssb-td ssb-td-total">
                                                <span className={total < 0 ? "ssb-neg" : "ssb-total-val"}>
                                                    {total}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="ssb-footer">
                    <span className="ssb-footer-note">
                        {noCompletedGames
                            ? "Live scores update after each game"
                            : "~ = live trick points · final scores update at game end"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ScoreboardModal;
