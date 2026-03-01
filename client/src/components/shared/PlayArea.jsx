import { useCallback, useState, useEffect, useRef } from "react";
import { useCardAnimation } from "./useCardAnimation";

/**
 * Central play area for card games.
 * Renders played cards in "thrown" (random pile) or "inspect" (neat arrangement) mode.
 * Click to toggle modes.
 *
 * When a trick completes (plays go from non-empty to empty while tricksCount increases),
 * the cards are held on the table for 2 seconds then sweep toward the winner before vanishing.
 *
 * @param {Array} plays - Array of { playerId, card } objects
 * @param {boolean} inspectMode - Whether cards are arranged neatly
 * @param {Function} onToggleInspect - Called when play area is clicked
 * @param {Function} getCardSvg - (card) => ReactComponent for rendering card faces
 * @param {Function} cardKeyFn - (card) => string for unique keys
 * @param {Function} getName - (playerId) => string for player names
 * @param {Object} seatPositionMap - { playerId: { left, top, angle } } from CircularTable
 * @param {number} tableSize - Table diameter in px (from CircularTable)
 * @param {string} roundLabel - Optional label like "Round 3"
 * @param {Array} seatOrder - Array of player IDs in seat order (for inspect layout)
 * @param {number} tricksCount - Number of completed tricks (for detecting trick completion)
 * @param {string|null} lastTrickWinner - Player ID of the last trick's winner
 */
const PlayArea = ({
    plays = [],
    inspectMode = false,
    onToggleInspect,
    getCardSvg,
    cardKeyFn,
    getName = (pid) => pid?.substring(0, 8),
    seatPositionMap = {},
    tableSize = 520,
    roundLabel,
    seatOrder = [],
    tricksCount = 0,
    lastTrickWinner = null,
}) => {
    // Key function for animation hook
    const keyFn = useCallback(
        (play) => (cardKeyFn ? cardKeyFn(play.card) : `${play.playerId}_${plays.indexOf(play)}`),
        [cardKeyFn, plays]
    );

    const { animatingCardKey } = useCardAnimation(plays, keyFn, 600);

    // ── Departing trick state ──
    // When a trick completes, hold cards for 2s then sweep toward winner
    const prevPlaysRef = useRef([]);
    const prevTricksCountRef = useRef(0);
    // departingState: null | { plays, winner, phase: 'hold' | 'sweep' }
    const [departingState, setDepartingState] = useState(null);

    // Detect trick completion: plays went non-empty → empty AND tricksCount increased
    useEffect(() => {
        const prevPlays = prevPlaysRef.current;
        const prevCount = prevTricksCountRef.current;

        if (
            prevPlays.length > 0 &&
            plays.length === 0 &&
            tricksCount > prevCount &&
            lastTrickWinner
        ) {
            // Trick just completed — hold the old cards
            setDepartingState({
                plays: prevPlays,
                winner: lastTrickWinner,
                phase: "hold",
            });
        }

        prevPlaysRef.current = plays;
        prevTricksCountRef.current = tricksCount;
    }, [plays, tricksCount, lastTrickWinner]);

    // Phase transitions: hold (2s) → sweep (0.8s) → clear
    useEffect(() => {
        if (!departingState) return;

        if (departingState.phase === "hold") {
            const timer = setTimeout(() => {
                setDepartingState((prev) =>
                    prev ? { ...prev, phase: "sweep" } : null
                );
            }, 2000);
            return () => clearTimeout(timer);
        }
        if (departingState.phase === "sweep") {
            const timer = setTimeout(() => {
                setDepartingState(null);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [departingState]);

    /**
     * Deterministic pseudo-random position from card key string.
     * Produces consistent offsets so cards don't jump on re-render.
     */
    const thrownPosition = (card) => {
        const key = cardKeyFn ? cardKeyFn(card) : `${card.suit}${card.rank}`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) - hash) + key.charCodeAt(i);
            hash |= 0;
        }
        const x = ((hash & 0xFF) / 255) * 120 - 60;          // -60 to +60 px
        const y = (((hash >> 8) & 0xFF) / 255) * 80 - 40;    // -40 to +40 px
        const rotate = (((hash >> 16) & 0xFF) / 255) * 50 - 25; // -25 to +25 deg
        return { x, y, rotate };
    };

    /**
     * Inspect mode: place each card along a circle toward the player who played it.
     * Uses the seat angle from seatPositionMap so each card points at its player.
     */
    const inspectPosition = (play) => {
        const pos = seatPositionMap[play.playerId];
        if (!pos) return { x: 0, y: 0, rotate: 0 };
        // Radius keeps cards within the play area (table-center is 60% of tableSize)
        const inspectRadius = Math.min(tableSize * 0.6, 312) * 0.38;
        const x = Math.cos(pos.angle) * inspectRadius;
        const y = Math.sin(pos.angle) * inspectRadius;
        return { x, y, rotate: 0 };
    };

    /**
     * Compute the seat direction offset for fly-in animation start position.
     * Uses the pre-computed seat angle to point from center toward the player.
     */
    const seatDirection = (playerId) => {
        const pos = seatPositionMap[playerId];
        if (!pos) return { x: 0, y: -120 };
        const scale = 120; // px from center — starts outside the play area
        return {
            x: Math.cos(pos.angle) * scale,
            y: Math.sin(pos.angle) * scale,
        };
    };

    // Show "Waiting for cards..." only if no current plays AND no departing trick
    const showEmpty = plays.length === 0 && !departingState;

    return (
        <div
            className={`play-area ${inspectMode ? "inspect-mode" : ""}`}
            onClick={onToggleInspect}
        >
            {roundLabel && (
                <div className="play-area-round">{roundLabel}</div>
            )}

            {showEmpty && (
                <div className="play-area-empty">
                    Waiting for cards...
                </div>
            )}

            {/* Departing trick cards (hold or sweep phase) */}
            {departingState?.plays?.map((play, index) => {
                const key = cardKeyFn
                    ? `dep_${cardKeyFn(play.card)}`
                    : `dep_${play.playerId}_${index}`;
                const CardSvg = getCardSvg ? getCardSvg(play.card) : null;
                const pos = thrownPosition(play.card);
                const winnerDir = seatDirection(departingState.winner);

                return (
                    <div
                        key={key}
                        className={`play-area-card ${
                            departingState.phase === "sweep" ? "departing" : ""
                        }`}
                        style={{
                            "--thrown-x": `${pos.x}px`,
                            "--thrown-y": `${pos.y}px`,
                            "--thrown-rotate": `${pos.rotate}deg`,
                            "--winner-x": `${winnerDir.x}px`,
                            "--winner-y": `${winnerDir.y}px`,
                        }}
                    >
                        {CardSvg && (
                            <CardSvg
                                style={{ height: "100%", width: "100%" }}
                            />
                        )}
                    </div>
                );
            })}

            {/* Current trick cards */}
            {plays.map((play, index) => {
                const key = cardKeyFn ? cardKeyFn(play.card) : `${play.playerId}_${index}`;
                const CardSvg = getCardSvg ? getCardSvg(play.card) : null;
                const isAnimating = key === animatingCardKey;
                const pos = inspectMode
                    ? inspectPosition(play)
                    : thrownPosition(play.card);
                const seatDir = seatDirection(play.playerId);

                return (
                    <div
                        key={key}
                        className={`play-area-card ${isAnimating && !inspectMode ? "entering" : ""}`}
                        style={{
                            "--thrown-x": `${pos.x}px`,
                            "--thrown-y": `${pos.y}px`,
                            "--thrown-rotate": `${pos.rotate}deg`,
                            "--seat-x": `${seatDir.x}px`,
                            "--seat-y": `${seatDir.y}px`,
                        }}
                    >
                        {CardSvg && (
                            <CardSvg
                                style={{ height: "100%", width: "100%" }}
                            />
                        )}
                        <div className="play-area-card-label">
                            {getName(play.playerId)}
                        </div>
                    </div>
                );
            })}

            {plays.length > 0 && !departingState && (
                <div className="play-area-inspect-hint">
                    {inspectMode ? "click to scatter" : "click to inspect"}
                </div>
            )}
        </div>
    );
};

export default PlayArea;
