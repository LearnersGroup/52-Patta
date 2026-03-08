import { useState, useEffect, useRef, useMemo } from "react";
import { getCardComponent, getCardBackComponent, cardKey } from "./utils/cardMapper";

const CARD_W = 70;
const CARD_H = 98;
const REVEAL_OVERLAP = 28;

const suitOrder = { S: 0, H: 1, D: 2, C: 3 };
const rankOrder = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

/** Fisher-Yates shuffle — returns a new shuffled copy of the array */
const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/**
 * Click-to-reveal overlay shown after cards are dealt.
 *
 * Phases:
 *  1. entering  (700 ms) — stage flies up from bottom
 *  2. revealing           — click to reveal cards one-by-one in RANDOM order
 *                           each revealed card fans out at its reveal-sequence position
 *  3. sorting   (500 ms) — after all revealed, cards animate to suit-sorted positions
 *  4. exiting   (750 ms) — stage flies back down
 */
const DealRevealOverlay = ({ cards, onComplete }) => {
    const [revealedCount, setRevealedCount] = useState(0);
    const [isEntering, setIsEntering] = useState(true);
    const [isSorting, setIsSorting] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; });

    // Cards sorted by suit / rank — canonical display order
    const sorted = useMemo(() => (
        [...cards].sort((a, b) => {
            const sd = suitOrder[a.suit] - suitOrder[b.suit];
            if (sd !== 0) return sd;
            return rankOrder[a.rank] - rankOrder[b.rank];
        })
    ), [cards]);

    const totalCards = sorted.length;

    // Randomised reveal order — computed once on mount.
    // revealOrder[seq] = index into sorted[] that gets revealed on the seq-th click.
    const [revealOrder] = useState(() =>
        shuffleArray(Array.from({ length: totalCards }, (_, i) => i))
    );

    // seqOf[sortedIdx] = reveal sequence number (0-indexed)
    const seqOf = useMemo(() => {
        const map = {};
        revealOrder.forEach((sortedIdx, seq) => { map[sortedIdx] = seq; });
        return map;
    }, [revealOrder]);

    const allRevealed = revealedCount >= totalCards;

    // Remove entering flag after entry animation
    useEffect(() => {
        const t = setTimeout(() => setIsEntering(false), 700);
        return () => clearTimeout(t);
    }, []);

    // After all cards revealed → sort animation (500 ms) → exit animation (750 ms)
    useEffect(() => {
        if (!allRevealed) return;
        const t = setTimeout(() => {
            setIsSorting(true);                        // cards animate to sorted positions
            setTimeout(() => {
                setIsExiting(true);                    // stage exits (CSS animation)
                setTimeout(() => onCompleteRef.current?.(), 750);
            }, 500);
        }, 1800);
        return () => clearTimeout(t);
    }, [allRevealed]);

    const handleClick = () => {
        if (isEntering || isSorting || isExiting || allRevealed) return;
        setRevealedCount((r) => r + 1);
    };

    const CardBack = getCardBackComponent();

    // Container width = maximum fan span
    const containerW = Math.max((totalCards - 1) * REVEAL_OVERLAP + CARD_W, CARD_W);

    // Pile sits at the current right edge of revealed cards
    const pileX = revealedCount * REVEAL_OVERLAP;

    return (
        <div
            className={[
                "deal-reveal-overlay",
                isEntering ? "drv-entering" : "",
                isExiting ? "drv-exiting" : "",
            ].join(" ")}
            onClick={handleClick}
        >
            <div className="drv-backdrop" />

            <div className="drv-stage">
                <div className="drv-title">
                    {allRevealed ? "Your hand is ready!" : "Click to reveal your cards"}
                </div>

                <div
                    className="drv-cards"
                    style={{ width: containerW, height: CARD_H + 12 }}
                >
                    {sorted.map((card, sortedIdx) => {
                        const seq = seqOf[sortedIdx];        // reveal sequence of this card
                        const isRevealed     = seq < revealedCount;
                        const isTop          = seq === revealedCount;
                        const isDepth1       = seq === revealedCount + 1;
                        const isDepth2       = seq === revealedCount + 2;
                        const isJustRevealed = seq === revealedCount - 1;

                        // Only render: revealed cards + top 3 unrevealed (depth effect)
                        if (!isRevealed && !isTop && !isDepth1 && !isDepth2) return null;

                        const depthOffsetX = isDepth2 ? 6 : isDepth1 ? 3 : 0;
                        const depthOffsetY = isDepth2 ? 4 : isDepth1 ? 2 : 0;

                        // During reveal: fan by reveal-sequence position.
                        // During sorting/exiting: cards animate to SORTED suit positions.
                        let leftPos;
                        if (isRevealed) {
                            leftPos = (isSorting || isExiting)
                                ? sortedIdx * REVEAL_OVERLAP   // sorted position
                                : seq * REVEAL_OVERLAP;        // reveal-sequence position
                        } else {
                            leftPos = pileX + depthOffsetX;
                        }

                        const topPos  = isRevealed ? 0 : depthOffsetY;
                        const zIdx    = isRevealed ? seq + 10 : totalCards - seq + 10;
                        const opacity = isDepth2 ? 0.55 : isDepth1 ? 0.75 : 1;

                        const CardSvg = isRevealed ? getCardComponent(card) : null;

                        return (
                            <div
                                key={cardKey(card)}
                                className={[
                                    "drv-card",
                                    isRevealed ? "drv-card--face" : "drv-card--back",
                                    isTop ? "drv-card--top" : "",
                                    isJustRevealed ? "drv-card--just-revealed" : "",
                                    isSorting || isExiting ? "drv-card--sorting" : "",
                                ].join(" ")}
                                style={{
                                    left: leftPos,
                                    top: topPos,
                                    zIndex: zIdx,
                                    width: CARD_W,
                                    height: CARD_H,
                                    opacity,
                                }}
                            >
                                {isRevealed && CardSvg ? (
                                    <CardSvg style={{ width: "100%", height: "100%" }} />
                                ) : (
                                    <CardBack style={{ width: "100%", height: "100%" }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {!allRevealed && !isEntering && (
                    <div className="drv-hint">
                        {totalCards - revealedCount} card
                        {totalCards - revealedCount !== 1 ? "s" : ""} remaining
                    </div>
                )}

                {allRevealed && !isSorting && !isExiting && (
                    <div className="drv-hint drv-hint--done">Sorting your hand…</div>
                )}
            </div>
        </div>
    );
};

export default DealRevealOverlay;
