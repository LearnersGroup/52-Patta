import { memo, useState, useEffect, useMemo, useRef } from "react";
import { getCardComponent, getCardBackComponent } from "./utils/cardMapper";

/**
 * Shown during the "dealing" phase.
 *
 * When rendered inside the circular table (isTableCenter):
 *   - Shows a mini card deck in the center.
 *   - Spawns flying card animations one-per-deal-event toward each player's seat.
 *   - Shows a progress bar driven by visibleCount.
 *
 * The deal order is round-robin starting from the player after the dealer (clockwise).
 * Each player's direction is taken from seatPositionMap[id].angle (radians, screen coords).
 * "Me" (userId) is always at angle = π/2 (straight down toward my hand).
 */
const DealingOverlay = memo(({
    myHand = [],
    cutCard,
    dealingConfig,
    isDealer,
    visibleCount = 0,
    isTableCenter = false,
    // Seat / animation props (only used when isTableCenter)
    seatOrder = [],
    dealerIndex = 0,
    userId = "",
    seatPositionMap = {},
    tableSize = 360,
}) => {
    const [showCutCard, setShowCutCard] = useState(!!cutCard && isDealer);
    const [flyingCards, setFlyingCards] = useState([]);

    const cutRevealMs = dealingConfig?.cutCardRevealMs || 1500;
    const CardBack = getCardBackComponent();

    // Cut card reveal phase (dealer only)
    useEffect(() => {
        if (!cutCard || !isDealer) return;
        setShowCutCard(true);
        const timer = setTimeout(() => setShowCutCard(false), cutRevealMs);
        return () => clearTimeout(timer);
    }, [cutCard, isDealer, cutRevealMs]);

    // Computed deal order: player IDs in dealing sequence (clockwise from dealer's left)
    const dealOrder = useMemo(() => {
        const N = seatOrder.length;
        if (N === 0) return [];
        return Array.from({ length: N }, (_, i) =>
            seatOrder[(dealerIndex + 1 + i) % N]
        );
    }, [seatOrder, dealerIndex]);

    // Keep refs so the interval callback always sees fresh values without re-creating it
    const dealOrderRef = useRef(dealOrder);
    useEffect(() => { dealOrderRef.current = dealOrder; }, [dealOrder]);
    const seatPosRef = useRef(seatPositionMap);
    useEffect(() => { seatPosRef.current = seatPositionMap; }, [seatPositionMap]);
    const userIdRef = useRef(userId);
    useEffect(() => { userIdRef.current = userId; }, [userId]);

    // Flying-card animation: one card spawned per deal event
    useEffect(() => {
        const N = seatOrder.length;
        const C = myHand.length;           // cards per player
        if (!isTableCenter || N === 0 || C === 0) return;

        const totalCards = N * C;
        const animMs = dealingConfig?.animationDurationMs || 3000;
        // Spread evenly across 85% of the dealing window so animation finishes before transition
        const intervalMs = Math.max(40, (animMs * 0.85) / totalCards);
        const flyDurationMs = Math.min(420, intervalMs * 3.5);

        let idx = 0;
        const timer = setInterval(() => {
            if (idx >= totalCards) { clearInterval(timer); return; }

            const playerIdx = idx % N;
            const targetId = dealOrderRef.current[playerIdx];
            const isMe = targetId === userIdRef.current;
            // "Me" is always at the bottom of the circular table (π/2 = straight down)
            const angle = isMe
                ? Math.PI / 2
                : (seatPosRef.current[targetId]?.angle ?? 0);

            const id = performance.now() + Math.random();
            setFlyingCards(prev => [...prev, { id, angle, isMe }]);
            // Remove after animation completes
            setTimeout(() => {
                setFlyingCards(prev => prev.filter(c => c.id !== id));
            }, flyDurationMs + 50);

            idx++;
        }, intervalMs);

        return () => clearInterval(timer);
        // Only re-run if the hand size or player count changes (i.e., a new deal starts)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myHand.length, seatOrder.length, isTableCenter]);

    // Distance cards travel: slightly beyond the table edge toward each seat
    const travelDist = tableSize * 0.64;

    const wrapperClass = isTableCenter
        ? "dealing-overlay table-center-variant"
        : "dealing-overlay";

    return (
        <div className={wrapperClass}>
            {/* Flying cards (absolutely positioned from center of this element) */}
            {isTableCenter && flyingCards.map(card => (
                <div
                    key={card.id}
                    className={`dealing-fly-card${card.isMe ? " dealing-fly-card--me" : ""}`}
                    style={{
                        "--fly-dx": `${Math.cos(card.angle) * travelDist}px`,
                        "--fly-dy": `${Math.sin(card.angle) * travelDist}px`,
                    }}
                >
                    {CardBack && <CardBack style={{ width: "100%", height: "100%" }} />}
                </div>
            ))}

            {/* Cut card reveal (dealer only) */}
            {showCutCard && cutCard && (
                <div className="cut-card-reveal">
                    <div className="cut-card-container">
                        {(() => {
                            const CutCardSvg = getCardComponent(cutCard);
                            return CutCardSvg ? (
                                <CutCardSvg style={{ height: "100%", width: "100%" }} />
                            ) : (
                                <div className="cut-card-fallback">
                                    {cutCard.rank} of {cutCard.suit}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="cut-card-text">
                        Cut card &mdash; this will be your last card
                    </div>
                </div>
            )}

            {/* Dealing progress */}
            {!showCutCard && (
                <div className="dealing-status">
                    {/* Mini deck visual (3 stacked card backs) */}
                    {isTableCenter && myHand.length > 0 && (
                        <div className="dealing-deck">
                            <div className="dealing-deck-card" style={{ transform: "translate(-2px, -2px)" }} />
                            <div className="dealing-deck-card" style={{ transform: "translate(-1px, -1px)" }} />
                            <div className="dealing-deck-card dealing-deck-top">
                                {CardBack && (
                                    <CardBack style={{ width: "100%", height: "100%", borderRadius: 4 }} />
                                )}
                            </div>
                        </div>
                    )}
                    <div className="dealing-text">
                        {isTableCenter ? "Dealing…" : `Dealing cards... ${visibleCount} / ${myHand.length}`}
                    </div>
                    <div className="dealing-progress-bar">
                        <div
                            className="dealing-progress-fill"
                            style={{
                                width: myHand.length > 0
                                    ? `${(visibleCount / myHand.length) * 100}%`
                                    : "0%",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

DealingOverlay.displayName = "DealingOverlay";

export default DealingOverlay;
