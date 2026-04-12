import { memo } from "react";
import { useSelector } from "react-redux";
import { WsNextRound } from "../../api/wsEmitters";

const RESULT_LABELS = {
    "win-by-tricks":       "Won by Tricks",
    "win-by-mendi":        "Won by Tens (Mendi)",
    mendikot:              "Mendikot! (All 4 Tens)",
    "52-card mendikot":    "52-Card Mendikot! (All Tricks)",
};

const TOTAL_CATEGORY_KEYS = [
    "win-by-tricks",
    "win-by-mendi",
    "mendikot",
    "52-card mendikot",
];

/**
 * End-of-round and end-of-series scoreboard for Mendikot.
 * Shows: round result banner, current-round trick/tens summary,
 * session totals table, round history, and next-round/series-done button.
 */
const MendikotScoreBoard = memo(({ phase, nextRoundReady, userId, isAdmin }) => {
    const scoringResult    = useSelector((s) => s.game.scoringResult);
    const tricksByTeam     = useSelector((s) => s.game.tricks_by_team) || { A: 0, B: 0 };
    const tensByTeam       = useSelector((s) => s.game.tens_by_team) || { A: 0, B: 0 };
    const sessionTotals    = useSelector((s) => s.game.session_totals) || { A: {}, B: {} };
    const roundResults     = useSelector((s) => s.game.round_results) || [];
    const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
    const totalRounds      = useSelector((s) => s.game.totalRounds) || 1;

    const isSeries = phase === "series-finished";
    const readyCount = nextRoundReady?.readyPlayers?.length || 0;
    const totalCount = nextRoundReady?.totalPlayers || 0;

    const winnerTeam = scoringResult?.winningTeam?.toLowerCase();

    return (
        <div className="mendikot-scoreboard">
            {/* ── Round result banner ── */}
            {scoringResult && (
                <div className={`mendikot-result-banner${winnerTeam ? ` mendikot-result-banner--team-${winnerTeam}` : ""}`}>
                    <div className="mendikot-result-winner">
                        Team {scoringResult.winningTeam} Wins!
                    </div>
                    <div className="mendikot-result-type">
                        {RESULT_LABELS[scoringResult.type] || scoringResult.type}
                    </div>
                </div>
            )}

            {/* ── Current round summary ── */}
            <div className="mendikot-round-summary">
                <div className="mendikot-round-summary-title">
                    Round {currentRoundNumber} of {totalRounds}
                </div>
                <div className="mendikot-round-row">
                    <span className="mendikot-team-label--a">Team A:</span>
                    <span>{tricksByTeam.A} tricks, {tensByTeam.A} ten{tensByTeam.A !== 1 ? "s" : ""}</span>
                </div>
                <div className="mendikot-round-row">
                    <span className="mendikot-team-label--b">Team B:</span>
                    <span>{tricksByTeam.B} tricks, {tensByTeam.B} ten{tensByTeam.B !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* ── Session totals table ── */}
            <div className="mendikot-session-totals">
                <div className="mendikot-session-title">Session Totals</div>
                <table className="mendikot-totals-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th className="mendikot-col--a">Team A</th>
                            <th className="mendikot-col--b">Team B</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TOTAL_CATEGORY_KEYS.map((key) => (
                            <tr key={key}>
                                <td>{RESULT_LABELS[key]}</td>
                                <td className="mendikot-col--a">{sessionTotals.A?.[key] || 0}</td>
                                <td className="mendikot-col--b">{sessionTotals.B?.[key] || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Round history ── */}
            {roundResults.length > 1 && (
                <div className="mendikot-round-history">
                    <div className="mendikot-round-history-title">Round History</div>
                    {roundResults.map((r) => (
                        <div key={r.roundNumber} className="mendikot-round-history-row">
                            <span className="mendikot-round-history-num">R{r.roundNumber}</span>
                            <span className={`mendikot-round-history-winner mendikot-team-label--${r.winningTeam?.toLowerCase()}`}>
                                Team {r.winningTeam}
                            </span>
                            <span className="mendikot-round-history-type">
                                {RESULT_LABELS[r.type] || r.type}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Next round / Series done ── */}
            {isSeries ? (
                <div className="mendikot-series-done">Series complete! 🎉</div>
            ) : (
                <div className="mendikot-next-round">
                    <button className="btn-primary" onClick={() => WsNextRound()}>
                        Next Round
                    </button>
                    {totalCount > 0 && (
                        <div className="mendikot-next-ready-count">
                            {readyCount} / {totalCount} ready
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

MendikotScoreBoard.displayName = "MendikotScoreBoard";
export default MendikotScoreBoard;
