import { memo, useCallback, useState, useEffect, useRef } from "react";
import { useCardAnimation } from "./useCardAnimation";

const RANK_ORDER = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
};

function findWinningIndex(plays = [], trumpSuit = null) {
    if (!plays.length) return -1;

    const ledSuit = plays[0]?.card?.suit;
    if (!ledSuit) return -1;

    const indexed = plays.map((play, index) => ({ play, index }));
    const trumpPlays = indexed.filter(({ play }) => play.card?.suit === trumpSuit);
    const ledSuitPlays = indexed.filter(({ play }) => play.card?.suit === ledSuit);
    const contenderGroup = trumpPlays.length > 0 && trumpSuit !== ledSuit ? trumpPlays : ledSuitPlays;

    if (!contenderGroup.length) return 0;

    let winner = contenderGroup[0];
    for (let i = 1; i < contenderGroup.length; i++) {
        const current = contenderGroup[i];
        const currCard = current.play.card;
        const bestCard = winner.play.card;

        const isDuplicate = currCard?.suit === bestCard?.suit && currCard?.rank === bestCard?.rank;
        if (isDuplicate) {
            winner = current;
            continue;
        }

        if ((RANK_ORDER[currCard?.rank] || 0) > (RANK_ORDER[bestCard?.rank] || 0)) {
            winner = current;
        }
    }

    return winner.index;
}

/**
 * Central play area for card games.
 * Renders played cards in "thrown" (random pile) or "inspect" (neat arrangement) mode.
 * Click to toggle modes.
 *
 * When a trick completes, the last card flies in, all cards hold for 2s,
 * then sweep toward the winner and vanish.
 *
 * Uses a single "effectivePlays" array so React reuses DOM elements for
 * cards A,B,C (no flicker) when transitioning from current to departing.
 */
const PlayArea = memo(({
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
    lastTrickCards = null,
    trumpSuit = null,
}) => {
    // Key function for animation hook (only for current plays, not departing)
    const keyFn = useCallback(
        (play) => (cardKeyFn ? cardKeyFn(play.card) : `${play.playerId}_${plays.indexOf(play)}`),
        [cardKeyFn, plays]
    );

    const { animatingCardKey } = useCardAnimation(plays, keyFn, 600);

    // ── Departing trick state ──
    // departingState: null | { plays, winner, phase: 'hold' | 'sweep', lastCardAnimating }
    const [departingState, setDepartingState] = useState(null);
    const prevTricksCountRef = useRef(0);

    // Detect trick completion via tricksCount increasing + lastTrickCards available
    useEffect(() => {
        if (
            tricksCount > prevTricksCountRef.current &&
            lastTrickCards?.length > 0 &&
            lastTrickWinner
        ) {
            // Trick just completed — show all N cards with last card fly-in
            setDepartingState({
                plays: lastTrickCards,
                winner: lastTrickWinner,
                phase: "hold",
                lastCardAnimating: true,
            });

            // Clear fly-in flag after animation duration
            const flyInTimer = setTimeout(() => {
                setDepartingState((prev) =>
                    prev ? { ...prev, lastCardAnimating: false } : null
                );
            }, 600);

            prevTricksCountRef.current = tricksCount;
            return () => clearTimeout(flyInTimer);
        }
        prevTricksCountRef.current = tricksCount;
    }, [tricksCount, lastTrickCards, lastTrickWinner]);

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
     */
    const thrownPosition = (card) => {
        const key = cardKeyFn ? cardKeyFn(card) : `${card.suit}${card.rank}`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) - hash) + key.charCodeAt(i);
            hash |= 0;
        }
        const x = ((hash & 0xFF) / 255) * 120 - 60;
        const y = (((hash >> 8) & 0xFF) / 255) * 80 - 40;
        const rotate = (((hash >> 16) & 0xFF) / 255) * 50 - 25;
        return { x, y, rotate };
    };

    /**
     * Inspect mode: place each card toward the player who played it.
     */
    const inspectPosition = (play) => {
        const pos = seatPositionMap[play.playerId];
        if (!pos) return { x: 0, y: 0, rotate: 0 };
        const inspectRadius = Math.min(tableSize * 0.6, 312) * 0.38;
        const x = Math.cos(pos.angle) * inspectRadius;
        const y = Math.sin(pos.angle) * inspectRadius;
        return { x, y, rotate: 0 };
    };

    /**
     * Compute the seat direction offset for fly-in / sweep animations.
     */
    const seatDirection = (playerId) => {
        const pos = seatPositionMap[playerId];
        if (!pos) return { x: 0, y: -120 };
        const scale = 120;
        return {
            x: Math.cos(pos.angle) * scale,
            y: Math.sin(pos.angle) * scale,
        };
    };

    // ── Unified rendering ──
    // Use a single effectivePlays array so React reuses DOM elements (same keys)
    const isDeparting = !!departingState;
    const effectivePlays = isDeparting ? departingState.plays : plays;
    const showEmpty = effectivePlays.length === 0;
    const winnerDir = isDeparting ? seatDirection(departingState.winner) : { x: 0, y: 0 };
    const winningIndex = isDeparting ? -1 : findWinningIndex(plays, trumpSuit);

    return (
        <div
            className={`play-area ${inspectMode && !isDeparting ? "inspect-mode" : ""}`}
            onClick={isDeparting ? undefined : onToggleInspect}
        >
            {roundLabel && (
                <div className="play-area-round">{roundLabel}</div>
            )}

            {showEmpty && (
                <div className="play-area-empty">
                    Waiting for cards...
                </div>
            )}

            {effectivePlays.map((play, index) => {
                const key = cardKeyFn ? cardKeyFn(play.card) : `${play.playerId}_${index}`;
                const CardSvg = getCardSvg ? getCardSvg(play.card) : null;

                // Animation classes
                const isLastCardEntry =
                    isDeparting &&
                    departingState.lastCardAnimating &&
                    index === effectivePlays.length - 1;
                const isCurrentAnimating =
                    !isDeparting && key === animatingCardKey && !inspectMode;
                const isSweeping = departingState?.phase === "sweep";
                const isWinning = !isDeparting && effectivePlays.length > 0 && index === winningIndex;

                // During departing hold/sweep: always use thrown positions
                const pos =
                    inspectMode && !isDeparting
                        ? inspectPosition(play)
                        : thrownPosition(play.card);
                const seatDir = seatDirection(play.playerId);

                return (
                    <div
                        key={key}
                        className={`play-area-card ${
                            isLastCardEntry || isCurrentAnimating ? "entering" : ""
                        } ${isSweeping ? "departing" : ""} ${isWinning ? "winning" : ""}`}
                        style={{
                            "--thrown-x": `${pos.x}px`,
                            "--thrown-y": `${pos.y}px`,
                            "--thrown-rotate": `${pos.rotate}deg`,
                            "--seat-x": `${seatDir.x}px`,
                            "--seat-y": `${seatDir.y}px`,
                            "--winner-x": `${winnerDir.x}px`,
                            "--winner-y": `${winnerDir.y}px`,
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

            {!isDeparting && plays.length > 0 && (
                <div className="play-area-winning-label">
                    {getName(plays[winningIndex].playerId)} is leading
                </div>
            )}
        </div>
    );
});

PlayArea.displayName = "PlayArea";

export default PlayArea;
