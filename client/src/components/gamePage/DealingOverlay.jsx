import React, { useState, useEffect } from "react";
import { getCardComponent, cardKey } from "./utils/cardMapper";

const DealingOverlay = ({
    myHand = [],
    cutCard,
    dealingConfig,
    isDealer,
    onComplete,
}) => {
    const [visibleCount, setVisibleCount] = useState(0);
    const [showCutCard, setShowCutCard] = useState(!!cutCard && isDealer);

    const animDuration = dealingConfig?.animationDurationMs || 5000;
    const cutRevealMs = dealingConfig?.cutCardRevealMs || 1500;

    // Cut card reveal phase (dealer only)
    useEffect(() => {
        if (!cutCard || !isDealer) return;

        setShowCutCard(true);
        const timer = setTimeout(() => {
            setShowCutCard(false);
        }, cutRevealMs);

        return () => clearTimeout(timer);
    }, [cutCard, isDealer, cutRevealMs]);

    // Card dealing animation — reveal one card at a time
    useEffect(() => {
        if (myHand.length === 0) return;

        const delay = showCutCard && isDealer ? cutRevealMs : 0;
        const interval = animDuration / myHand.length;

        const startTimer = setTimeout(() => {
            let count = 0;
            const dealInterval = setInterval(() => {
                count++;
                setVisibleCount(count);
                if (count >= myHand.length) {
                    clearInterval(dealInterval);
                    if (onComplete) onComplete();
                }
            }, interval);

            return () => clearInterval(dealInterval);
        }, delay);

        return () => clearTimeout(startTimer);
    }, [myHand.length, showCutCard, isDealer, cutRevealMs, animDuration]);

    return (
        <div className="dealing-overlay">
            {/* Cut card reveal (dealer only) */}
            {showCutCard && cutCard && (
                <div className="cut-card-reveal">
                    <div className="cut-card-container">
                        {(() => {
                            const CutCardSvg = getCardComponent(cutCard);
                            return CutCardSvg ? (
                                <CutCardSvg
                                    style={{ height: "100%", width: "100%" }}
                                />
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
                    <div className="dealing-text">
                        Dealing cards... {visibleCount} / {myHand.length}
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
};

export default DealingOverlay;
