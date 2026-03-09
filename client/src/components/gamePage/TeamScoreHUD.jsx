import { useState, useRef, useEffect } from "react";
import ScoreboardModal from "./ScoreboardModal";
import { getCardComponent, cardKey } from "./utils/cardMapper";

/**
 * Compact HUD fixed to the top-left.
 * Row 1 (pill): bid-vs-oppose score + scoreboard button.
 * Row 2 (pile): removed 2s shown as a stacked pile; click to fan out for 3s.
 */
const TeamScoreHUD = ({
    tricks = [],
    teams = {},
    leader,
    partnerCards = [],
    phase = "playing",
    removedTwos = [],
}) => {
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isPileOpen, setIsPileOpen]         = useState(false);
    const pileTimerRef                        = useRef(null);
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

    // ── Pile toggle ────────────────────────────────────────────────────────
    const handlePileClick = () => {
        if (isPileOpen) {
            // Manual close
            if (pileTimerRef.current) clearTimeout(pileTimerRef.current);
            setIsPileOpen(false);
        } else {
            setIsPileOpen(true);
            pileTimerRef.current = setTimeout(() => {
                setIsPileOpen(false);
            }, 3000);
        }
    };

    // Cleanup on unmount
    useEffect(() => () => {
        if (pileTimerRef.current) clearTimeout(pileTimerRef.current);
    }, []);

    // Up to 3 cards shown in the pile stack visual
    const pilePreview = removedTwos.slice(0, 3);

    return (
        <>
            <div className="hud-wrapper">
                {/* ── Score pill row ── */}
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

                {/* ── Removed 2s pile ── */}
                {removedTwos.length > 0 && (
                    <div className="removed-pile-wrap">
                        {/* Pile trigger */}
                        <button
                            className={`removed-pile-trigger ${isPileOpen ? "open" : ""}`}
                            onClick={handlePileClick}
                            title="Removed 2s"
                        >
                            <div className="removed-pile-stack">
                                {pilePreview.map((card, i) => {
                                    const CardSvg = getCardComponent(card);
                                    return (
                                        <div
                                            key={cardKey(card) + i}
                                            className="removed-pile-card"
                                            style={{ "--pile-i": i }}
                                        >
                                            {CardSvg && (
                                                <CardSvg
                                                    style={{
                                                        height: "100%",
                                                        width: "100%",
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="removed-pile-label">
                                ×{removedTwos.length}
                            </span>
                        </button>

                        {/* Expanded fan */}
                        {isPileOpen && (
                            <div className="removed-pile-expanded">
                                <span className="removed-pile-title">Removed 2s</span>
                                <div className="removed-pile-cards">
                                    {removedTwos.map((card, i) => {
                                        const CardSvg = getCardComponent(card);
                                        return (
                                            <div
                                                key={cardKey(card) + i}
                                                className="removed-pile-item"
                                                style={{ "--item-i": i }}
                                            >
                                                {CardSvg && (
                                                    <CardSvg
                                                        style={{
                                                            height: "100%",
                                                            width: "100%",
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showScoreboard && (
                <ScoreboardModal onClose={() => setShowScoreboard(false)} />
            )}
        </>
    );
};

export default TeamScoreHUD;
