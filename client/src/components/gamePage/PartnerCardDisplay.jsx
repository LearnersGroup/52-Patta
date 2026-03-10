import { memo } from "react";
import {
    getCardComponent,
    suitSymbol,
    isRedSuit,
} from "./utils/cardMapper";

/**
 * KaliTeer-specific: shows the PowerHouse suit badge alongside
 * partner card faces. Before reveal: "????" under the card.
 * After reveal: the partner player's name.
 */
const PartnerCardDisplay = memo(({
    partnerCards = [],
    powerHouseSuit,
    getName = (pid) => pid?.substring(0, 8),
}) => {
    if (!powerHouseSuit) return null;

    return (
        <div className="partner-display">
            <div
                className={`powerhouse-badge ${
                    isRedSuit(powerHouseSuit) ? "red" : "black"
                }`}
            >
                PowerHouse: {suitSymbol(powerHouseSuit)}
            </div>

            {partnerCards.length > 0 && (
                <div className="partner-cards-row">
                    {partnerCards.map((pc, idx) => {
                        const CardSvg = getCardComponent(pc.card);
                        const revealed = pc.revealed;
                        const label = revealed
                            ? getName(pc.partnerId)
                            : "????";

                        return (
                            <div
                                key={`${pc.card.suit}${pc.card.rank}_${idx}`}
                                className={`partner-card-slot ${
                                    revealed ? "revealed" : ""
                                }`}
                            >
                                {pc.whichCopy !== null && (
                                    <div className="partner-copy-num">
                                        #{pc.whichCopy === "1st" ? 1 : 2}
                                    </div>
                                )}
                                <div
                                    className={`partner-card-mini ${
                                        isRedSuit(pc.card.suit) ? "red" : ""
                                    }`}
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
                                <div
                                    className={`partner-label ${
                                        revealed ? "revealed" : ""
                                    }`}
                                >
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

PartnerCardDisplay.displayName = "PartnerCardDisplay";

export default PartnerCardDisplay;
