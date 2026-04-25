import { memo, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getCardComponent, cardKey } from "./utils/cardMapper";
import { WsNextRound } from "../../api/wsEmitters";

const RESULT_LABELS = {
    "win-by-tricks":       "Won by Tricks",
    "win-by-mendi":        "Won by Tens (Mendi)",
    mendikot:              "Mendikot! (All 4 Tens)",
    "52-card mendikot":    "52-Card Mendikot! (All Tricks)",
};

const RESULT_SHORT = {
    "win-by-tricks":       "Tricks",
    "win-by-mendi":        "Tens",
    mendikot:              "Mendikot!",
    "52-card mendikot":    "52 Patta!",
};

const TOTAL_CATEGORY_KEYS = [
    "win-by-tricks",
    "win-by-mendi",
    "mendikot",
    "52-card mendikot",
];

const AUTO_ADVANCE_SECS = 10;

// ── Team cell: tricks count + tens card icons ───────────────────────────────

const TeamCell = memo(({ team, roundData }) => {
    const tensCards = roundData.tens_cards_by_team?.[team] || [];
    const tricks = roundData.tricks_by_team?.[team] || 0;
    return (
        <div className="mhist-team-cell">
            <span className={`mhist-team-tricks mhist-team--${team.toLowerCase()}`}>
                {tricks}t
            </span>
            <div className="mhist-team-tens">
                {tensCards.map((card, i) => {
                    const CardSvg = getCardComponent(card);
                    return CardSvg ? (
                        <div key={cardKey(card) + i} className="mendikot-ten-icon mhist-ten-icon">
                            <CardSvg style={{ height: "100%", width: "100%" }} />
                        </div>
                    ) : null;
                })}
                {tensCards.length === 0 && <span className="mhist-no-tens">–</span>}
            </div>
        </div>
    );
});

// ── Round history table ─────────────────────────────────────────────────────

const RoundHistoryTable = memo(({ roundResults }) => (
    <div className="mhist-table">
        <div className="mhist-header">
            <span className="mhist-col-num">#</span>
            <span className="mhist-col-team mhist-col--a">Team A</span>
            <span className="mhist-col-team mhist-col--b">Team B</span>
            <span className="mhist-col-result">Result</span>
        </div>
        {roundResults.map((r) => {
            const winTeam = r.winningTeam?.toLowerCase();
            return (
                <div key={r.roundNumber} className={`mhist-row mhist-row--${winTeam}`}>
                    <span className="mhist-col-num">{r.roundNumber}</span>
                    <div className="mhist-col-team">
                        <TeamCell team="A" roundData={r} />
                    </div>
                    <div className="mhist-col-team">
                        <TeamCell team="B" roundData={r} />
                    </div>
                    <div className="mhist-col-result">
                        <span className={`mhist-win-label mhist-col--${winTeam}`}>
                            {r.winningTeam}
                        </span>
                        <span className="mhist-result-type">
                            {RESULT_SHORT[r.type] || r.type}
                        </span>
                    </div>
                </div>
            );
        })}
    </div>
));

// ── Countdown bar ───────────────────────────────────────────────────────────

const CountdownBar = memo(() => {
    const [secs, setSecs] = useState(AUTO_ADVANCE_SECS);

    useEffect(() => {
        if (secs <= 0) return;
        const t = setTimeout(() => setSecs((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [secs]);

    return (
        <div className="mendikot-auto-advance">
            <div className="mendikot-auto-advance-track">
                <div
                    className="mendikot-auto-advance-fill"
                    style={{ width: `${(secs / AUTO_ADVANCE_SECS) * 100}%` }}
                />
            </div>
            <div className="mendikot-auto-advance-row">
                <span className="mendikot-auto-advance-text">
                    Next round in {secs}s
                </span>
                <button className="mendikot-skip-btn btn-ghost" onClick={() => WsNextRound()}>
                    Skip
                </button>
            </div>
        </div>
    );
});

// ── Main component ──────────────────────────────────────────────────────────

const MendikotScoreBoard = memo(({ phase }) => {
    const scoringResult      = useSelector((s) => s.game.scoringResult);
    const sessionTotals      = useSelector((s) => s.game.session_totals) || { A: {}, B: {} };
    const roundResults       = useSelector((s) => s.game.round_results) || [];
    const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
    const totalRounds        = useSelector((s) => s.game.totalRounds) || 1;

    const isSeries   = phase === "series-finished";
    const winnerTeam = scoringResult?.winningTeam?.toLowerCase();

    const resultBanner = scoringResult && (
        <div className={`mendikot-result-banner${winnerTeam ? ` mendikot-result-banner--team-${winnerTeam}` : ""}`}>
            <div className="mendikot-result-winner">Team {scoringResult.winningTeam} Wins!</div>
            <div className="mendikot-result-type">{RESULT_LABELS[scoringResult.type] || scoringResult.type}</div>
        </div>
    );

    if (!isSeries) {
        return (
            <div className="mendikot-scoreboard">
                {resultBanner}
                <RoundHistoryTable roundResults={roundResults} />
                <CountdownBar key={currentRoundNumber} />
            </div>
        );
    }

    // Series-end: full summary
    return (
        <div className="mendikot-scoreboard">
            {resultBanner}

            <RoundHistoryTable roundResults={roundResults} />

            <div className="mendikot-session-totals">
                <div className="mendikot-session-title">
                    Session Totals — {totalRounds} round{totalRounds !== 1 ? "s" : ""}
                </div>
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

            <div className="mendikot-series-done">Series complete! 🎉</div>
        </div>
    );
});

MendikotScoreBoard.displayName = "MendikotScoreBoard";
export default MendikotScoreBoard;
