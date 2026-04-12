import { memo, useState } from "react";
import { useSelector } from "react-redux";
import { getCardComponent, cardKey, suitSymbol, isRedSuit } from "./utils/cardMapper";

/**
 * Compact in-game HUD for Mendikot — top-left, mirrors TeamScoreHUD layout.
 *
 * Row 1 (pill): Team A tricks vs Team B tricks + trump indicator + round counter + scoreboard toggle.
 * Expandable inline panel: trick counts + collected tens with card-component icons.
 *   "Team A: 3 tricks  ♠10  ♦10"
 *   "Team B: 1 trick   ♥10"
 */
const MendikotHUD = memo(({ phase, removedTwos = [] }) => {
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [isPileOpen, setIsPileOpen] = useState(false);

    const tricksByTeam    = useSelector((s) => s.game.tricks_by_team) || { A: 0, B: 0 };
    const tensByTeam      = useSelector((s) => s.game.tens_by_team) || { A: 0, B: 0 };
    const tensCardsByTeam = useSelector((s) => s.game.tens_cards_by_team) || { A: [], B: [] };
    const trump_suit      = useSelector((s) => s.game.trump_suit);
    const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
    const totalRounds     = useSelector((s) => s.game.totalRounds) || 1;
    const isPlaying       = phase === "playing";

    const trumpDisplay = trump_suit ? (
        <span className={`mendikot-hud-trump-suit${isRedSuit(trump_suit) ? " red" : " black"}`}>
            {suitSymbol(trump_suit)}
        </span>
    ) : (
        <span className="mendikot-hud-trump-unknown">?</span>
    );

    return (
        <div className="hud-wrapper mendikot-hud-wrapper">
            <div className="team-score-hud mendikot-hud">
                {isPlaying && (
                    <>
                        {/* Team A */}
                        <div className="hud-team mendikot-hud-team mendikot-hud-team--a">
                            <span className="hud-dot mendikot-dot--a" />
                            <span className="mendikot-hud-team-label">A</span>
                            <span className="hud-score">{tricksByTeam.A}</span>
                        </div>
                        <span className="hud-vs">vs</span>
                        {/* Team B */}
                        <div className="hud-team mendikot-hud-team mendikot-hud-team--b">
                            <span className="hud-dot mendikot-dot--b" />
                            <span className="mendikot-hud-team-label">B</span>
                            <span className="hud-score">{tricksByTeam.B}</span>
                        </div>
                        {/* Trump indicator */}
                        <div className="mendikot-hud-trump" title={trump_suit ? `Trump: ${trump_suit}` : "Trump hidden"}>
                            {trumpDisplay}
                        </div>
                        <div className="hud-divider" />
                    </>
                )}
                {/* Round counter */}
                <span className="mendikot-hud-round">Rd {currentRoundNumber}/{totalRounds}</span>
                {/* Scoreboard toggle */}
                <button
                    className="hud-scoreboard-btn"
                    onClick={() => setShowScoreboard((v) => !v)}
                    title="Toggle scoreboard"
                >
                    {showScoreboard ? "▲" : "⊞"}
                </button>
            </div>

            {/* Inline scoreboard panel — toggleable */}
            {showScoreboard && (
                <div className="mendikot-inline-scoreboard">
                    {/* Team A row */}
                    <div className="mendikot-inline-team mendikot-inline-team--a">
                        <span className="mendikot-inline-team-name">Team A</span>
                        <span className="mendikot-inline-tricks">
                            {tricksByTeam.A} trick{tricksByTeam.A !== 1 ? "s" : ""}
                        </span>
                        <div className="mendikot-inline-tens">
                            {(tensCardsByTeam.A || []).map((card, i) => {
                                const CardSvg = getCardComponent(card);
                                return CardSvg ? (
                                    <div
                                        key={cardKey(card) + i}
                                        className="mendikot-ten-icon"
                                        title={`${card.rank} of ${card.suit}`}
                                    >
                                        <CardSvg style={{ height: "100%", width: "100%" }} />
                                    </div>
                                ) : null;
                            })}
                            {tensByTeam.A === 0 && (
                                <span className="mendikot-inline-no-tens">no tens</span>
                            )}
                        </div>
                    </div>

                    <div className="mendikot-inline-divider" />

                    {/* Team B row */}
                    <div className="mendikot-inline-team mendikot-inline-team--b">
                        <span className="mendikot-inline-team-name">Team B</span>
                        <span className="mendikot-inline-tricks">
                            {tricksByTeam.B} trick{tricksByTeam.B !== 1 ? "s" : ""}
                        </span>
                        <div className="mendikot-inline-tens">
                            {(tensCardsByTeam.B || []).map((card, i) => {
                                const CardSvg = getCardComponent(card);
                                return CardSvg ? (
                                    <div
                                        key={cardKey(card) + i}
                                        className="mendikot-ten-icon"
                                        title={`${card.rank} of ${card.suit}`}
                                    >
                                        <CardSvg style={{ height: "100%", width: "100%" }} />
                                    </div>
                                ) : null;
                            })}
                            {tensByTeam.B === 0 && (
                                <span className="mendikot-inline-no-tens">no tens</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Removed 2s pile (same pattern as TeamScoreHUD) */}
            {removedTwos.length > 0 && (
                <div className="removed-pile-wrap">
                    <button
                        className={`removed-pile-trigger${isPileOpen ? " open" : ""}`}
                        onClick={() => setIsPileOpen((v) => !v)}
                        title="Removed 2s"
                    >
                        <span className="removed-pile-label">×{removedTwos.length} 2s</span>
                    </button>
                    {isPileOpen && (
                        <div className="removed-pile-expanded">
                            <span className="removed-pile-title">Removed 2s</span>
                            <div className="removed-pile-cards">
                                {removedTwos.map((card, i) => {
                                    const CardSvg = getCardComponent(card);
                                    return CardSvg ? (
                                        <div
                                            key={cardKey(card) + i}
                                            className="removed-pile-item"
                                            style={{ "--item-i": i }}
                                        >
                                            <CardSvg style={{ height: "100%", width: "100%" }} />
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

MendikotHUD.displayName = "MendikotHUD";
export default MendikotHUD;
