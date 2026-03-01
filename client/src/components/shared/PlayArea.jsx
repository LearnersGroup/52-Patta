import { useCallback } from "react";
import { useCardAnimation } from "./useCardAnimation";

/**
 * Central play area for card games.
 * Renders played cards in "thrown" (random pile) or "inspect" (neat arrangement) mode.
 * Click to toggle modes.
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
}) => {
    // Key function for animation hook
    const keyFn = useCallback(
        (play) => (cardKeyFn ? cardKeyFn(play.card) : `${play.playerId}_${plays.indexOf(play)}`),
        [cardKeyFn, plays]
    );

    const { animatingCardKey } = useCardAnimation(plays, keyFn, 600);

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
        const x = ((hash & 0xFF) / 255) * 60 - 30;           // -30 to +30 px
        const y = (((hash >> 8) & 0xFF) / 255) * 40 - 20;    // -20 to +20 px
        const rotate = (((hash >> 16) & 0xFF) / 255) * 30 - 15; // -15 to +15 deg
        return { x, y, rotate };
    };

    /**
     * Inspect mode: position each card in a neat row, grouped by player.
     */
    const inspectPosition = (play, index) => {
        const total = plays.length;
        if (total === 0) return { x: 0, y: 0, rotate: 0 };
        const spreadWidth = Math.min(total * 70, 200);
        const startX = -spreadWidth / 2;
        const x = total === 1 ? 0 : startX + index * (spreadWidth / (total - 1));
        return { x, y: 0, rotate: 0 };
    };

    /**
     * Compute the seat direction offset for fly-in animation.
     * Points from center toward the player's seat position.
     */
    const seatDirection = (playerId) => {
        const pos = seatPositionMap[playerId];
        if (!pos) return { x: 0, y: -80 };
        // Convert seat position to offset from center of table
        const centerPx = tableSize / 2;
        const dx = pos.left - centerPx;
        const dy = pos.top - centerPx;
        // Normalize and scale to a starting point outside the play area
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const scale = 120 / dist; // start 120px away from center (outside the area)
        return { x: dx * scale, y: dy * scale };
    };

    return (
        <div
            className={`play-area ${inspectMode ? "inspect-mode" : ""}`}
            onClick={onToggleInspect}
        >
            {roundLabel && (
                <div className="play-area-round">{roundLabel}</div>
            )}

            {plays.length === 0 && (
                <div className="play-area-empty">
                    Waiting for cards...
                </div>
            )}

            {plays.map((play, index) => {
                const key = cardKeyFn ? cardKeyFn(play.card) : `${play.playerId}_${index}`;
                const CardSvg = getCardSvg ? getCardSvg(play.card) : null;
                const isAnimating = key === animatingCardKey;
                const pos = inspectMode
                    ? inspectPosition(play, index)
                    : thrownPosition(play.card);
                const seatDir = seatDirection(play.playerId);

                return (
                    <div
                        key={key}
                        className={`play-area-card ${isAnimating ? "entering" : ""}`}
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

            {plays.length > 0 && (
                <div className="play-area-inspect-hint">
                    {inspectMode ? "click to scatter" : "click to inspect"}
                </div>
            )}
        </div>
    );
};

export default PlayArea;
