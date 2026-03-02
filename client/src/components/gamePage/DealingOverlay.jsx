import React, { useState, useEffect } from "react";
import { getCardComponent } from "./utils/cardMapper";

const DealingOverlay = ({
    myHand = [],
    cutCard,
    dealingConfig,
    isDealer,
    visibleCount = 0,
    isTableCenter = false,
}) => {
    const [showCutCard, setShowCutCard] = useState(!!cutCard && isDealer);

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

    const wrapperClass = isTableCenter
        ? "dealing-overlay table-center-variant"
        : "dealing-overlay";

    return (
        <div className={wrapperClass}>
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
