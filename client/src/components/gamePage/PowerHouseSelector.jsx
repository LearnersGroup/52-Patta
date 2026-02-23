import React, { useState } from "react";
import {
    WsSelectPowerHouse,
    WsSelectPartners,
} from "../../api/wsEmitters";
import { suitSymbol, isRedSuit } from "./utils/cardMapper";

const SUITS = ["S", "H", "D", "C"];
const SUIT_NAMES = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };

const PowerHouseSelector = ({
    powerHouseSuit,
    partnerCards,
    myHand,
    configKey,
    partnerCardCount,
}) => {
    const [selectedSuit, setSelectedSuit] = useState(null);
    const [partnerInputs, setPartnerInputs] = useState([]);
    const [duplicateSpecs, setDuplicateSpecs] = useState({});

    // Use server-provided count (accounts for bid threshold), fall back to hardcoded
    const is2Deck = configKey?.includes("2D");
    const partnerCount = partnerCardCount || getPartnerCount(configKey);

    const handleSuitSelect = (suit) => {
        setSelectedSuit(suit);
        WsSelectPowerHouse(suit);
    };

    const handleAddPartner = () => {
        setPartnerInputs([
            ...partnerInputs,
            { suit: "S", rank: "A" },
        ]);
    };

    const handlePartnerChange = (index, field, value) => {
        const updated = [...partnerInputs];
        updated[index] = { ...updated[index], [field]: value };
        setPartnerInputs(updated);
    };

    const handleDuplicateSpec = (index, whichCopy) => {
        setDuplicateSpecs({ ...duplicateSpecs, [index]: whichCopy });
    };

    const handleSubmitPartners = () => {
        const cards = partnerInputs.map((p) => ({
            suit: p.suit,
            rank: p.rank,
        }));

        // Build duplicate specs for 2-deck: array of { card, whichCopy }
        // Only needed when leader holds 0 copies of the chosen card
        const specs = [];
        if (is2Deck) {
            partnerInputs.forEach((p, i) => {
                const holdCount = myHand.filter(
                    (c) => c.suit === p.suit && c.rank === p.rank
                ).length;
                if (holdCount === 0) {
                    // Default to "1st" if user didn't change the dropdown
                    const copyVal = duplicateSpecs[i] || 1;
                    specs.push({
                        card: { suit: p.suit, rank: p.rank },
                        whichCopy: copyVal === 1 ? "1st" : "2nd",
                    });
                }
            });
        }

        WsSelectPartners(cards, specs);
    };

    // If powerhouse not yet selected, show suit picker
    if (!powerHouseSuit && !selectedSuit) {
        return (
            <div className="powerhouse-panel">
                <h3>Select PowerHouse (Trump Suit)</h3>
                <div className="suit-picker">
                    {SUITS.map((suit) => (
                        <button
                            key={suit}
                            className={`suit-btn ${
                                isRedSuit(suit) ? "red" : "black"
                            }`}
                            onClick={() => handleSuitSelect(suit)}
                        >
                            <span className="suit-symbol">
                                {suitSymbol(suit)}
                            </span>
                            <span className="suit-name">
                                {SUIT_NAMES[suit]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // After powerhouse selected, show partner card picker
    const activeSuit = powerHouseSuit || selectedSuit;

    return (
        <div className="powerhouse-panel">
            <div className="powerhouse-selected">
                <span className="ph-label">PowerHouse:</span>
                <span
                    className={`ph-suit ${
                        isRedSuit(activeSuit) ? "red" : "black"
                    }`}
                >
                    {suitSymbol(activeSuit)} {SUIT_NAMES[activeSuit]}
                </span>
            </div>

            {partnerCards?.length === 0 && (
                <div className="partner-selection">
                    <h3>
                        Select Partner Cards ({partnerInputs.length}/
                        {partnerCount})
                    </h3>

                    {partnerInputs.map((p, i) => (
                        <div key={i} className="partner-input-row">
                            <select
                                value={p.suit}
                                onChange={(e) =>
                                    handlePartnerChange(i, "suit", e.target.value)
                                }
                                className="form-input partner-select"
                            >
                                {SUITS.map((s) => (
                                    <option key={s} value={s}>
                                        {suitSymbol(s)} {SUIT_NAMES[s]}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={p.rank}
                                onChange={(e) =>
                                    handlePartnerChange(i, "rank", e.target.value)
                                }
                                className="form-input partner-select"
                            >
                                {[
                                    "A", "K", "Q", "J", "10", "9", "8",
                                    "7", "6", "5", "4", "3", "2",
                                ].map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>

                            {is2Deck && needsDuplicateSpec(p, myHand) && (
                                <div className="duplicate-spec">
                                    <label className="spec-label">
                                        Which copy?
                                    </label>
                                    <select
                                        value={duplicateSpecs[i] || 1}
                                        onChange={(e) =>
                                            handleDuplicateSpec(
                                                i,
                                                Number(e.target.value)
                                            )
                                        }
                                        className="form-input partner-select"
                                    >
                                        <option value={1}>1st played</option>
                                        <option value={2}>2nd played</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}

                    {partnerInputs.length < partnerCount && (
                        <button
                            className="btn-secondary"
                            onClick={handleAddPartner}
                        >
                            + Add Partner Card
                        </button>
                    )}

                    {partnerInputs.length === partnerCount && (
                        <button
                            className="btn-primary"
                            onClick={handleSubmitPartners}
                        >
                            Confirm Partners
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

function getPartnerCount(configKey) {
    if (!configKey) return 1;
    const counts = {
        "4P1D": 1, "5P1D": 1, "6P1D": 2, "6P2D": 2,
        "7P2D": 2, "8P2D": 3, "9P2D": 3, "10P2D": 4,
    };
    return counts[configKey] || 1;
}

function needsDuplicateSpec(partnerCard, myHand) {
    const holdCount = myHand.filter(
        (c) => c.suit === partnerCard.suit && c.rank === partnerCard.rank
    ).length;
    return holdCount === 0;
}

export default PowerHouseSelector;
