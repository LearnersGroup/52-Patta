import { useState } from "react";
import ScoreboardModal from "./ScoreboardModal";

/**
 * Compact HUD fixed to the top-left.
 * - During playing phase: shows bid-vs-oppose score pills + scoreboard button.
 * - All other table phases: shows only the scoreboard button.
 *
 * Before all partners are revealed:
 *   - Bid team score = only the leader's trick points
 *   - Oppose team score = "???"
 *
 * After all partners revealed:
 *   - Bid team score = sum of all bid team members' trick points
 *   - Oppose team score = sum of all oppose team members' trick points
 */
const TeamScoreHUD = ({
    tricks = [],
    teams = {},
    leader,
    partnerCards = [],
    phase = "playing",
}) => {
    const [showScoreboard, setShowScoreboard] = useState(false);
    const isPlaying = phase === "playing";

    // Compute per-player trick points for current round
    const playerTrickPoints = {};
    tricks.forEach((t) => {
        if (t.winner) {
            playerTrickPoints[t.winner] =
                (playerTrickPoints[t.winner] || 0) + (t.points || 0);
        }
    });

    const allRevealed =
        partnerCards.length > 0 && partnerCards.every((pc) => pc.revealed);

    // Bid team score
    const bidScore = allRevealed
        ? (teams.bid || []).reduce(
              (sum, pid) => sum + (playerTrickPoints[pid] || 0),
              0
          )
        : playerTrickPoints[leader] || 0;

    // Oppose team score
    const opposeScore = allRevealed
        ? (teams.oppose || []).reduce(
              (sum, pid) => sum + (playerTrickPoints[pid] || 0),
              0
          )
        : null; // null = "???"

    return (
        <>
            <div className="team-score-hud">
                {isPlaying && (
                    <>
                        <div className="hud-team hud-bid">
                            <span className="hud-dot bid-dot" />
                            <span className="hud-score">{bidScore}</span>
                        </div>
                        <span className="hud-vs">vs</span>
                        <div className="hud-team hud-oppose">
                            <span className="hud-dot oppose-dot" />
                            <span className="hud-score">
                                {opposeScore !== null ? opposeScore : "???"}
                            </span>
                        </div>
                        <div className="hud-divider" />
                    </>
                )}

                <button
                    className="hud-scoreboard-btn"
                    onClick={() => setShowScoreboard(true)}
                    title="View full scoreboard"
                >
                    ⊞
                </button>
            </div>

            {showScoreboard && (
                <ScoreboardModal onClose={() => setShowScoreboard(false)} />
            )}
        </>
    );
};

export default TeamScoreHUD;
