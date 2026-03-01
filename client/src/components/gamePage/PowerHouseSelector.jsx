import React, { useState } from "react";
import {
    WsSelectPowerHouse,
    WsSelectPartners,
} from "../../api/wsEmitters";
import { suitSymbol, isRedSuit, getCardComponent } from "./utils/cardMapper";

const SUITS = ["S", "H", "D", "C"];
const SUIT_NAMES = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
const RANK_ORDER_DESC = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

const PowerHouseSelector = ({
    powerHouseSuit,
    partnerCards,
    myHand = [],
    configKey,
    partnerCardCount,
}) => {
    const [selectedSuit, setSelectedSuit] = useState(null);
    // selectedCards: [{suit, rank, whichCopy}] — whichCopy is 1|2|null
    const [selectedCards, setSelectedCards] = useState([]);
    const [expandedSuits, setExpandedSuits] = useState({});

    const is2Deck = configKey?.includes("2D");
    const partnerCount = partnerCardCount || getPartnerCount(configKey);

    const handleSuitSelect = (suit) => {
        setSelectedSuit(suit);
        WsSelectPowerHouse(suit);
    };

    // Cards this leader can validly pick as partner (not fully held)
    function getAvailableCardsForSuit(suit) {
        return RANK_ORDER_DESC.filter((rank) => {
            const holdCount = myHand.filter(
                (c) => c.suit === suit && c.rank === rank
            ).length;
            return is2Deck ? holdCount < 2 : holdCount === 0;
        }).map((rank) => ({ suit, rank }));
    }

    function isSelected(suit, rank) {
        return selectedCards.some((c) => c.suit === suit && c.rank === rank);
    }

    function getSelectedCard(suit, rank) {
        return selectedCards.find((c) => c.suit === suit && c.rank === rank);
    }

    function toggleCard(card) {
        if (isSelected(card.suit, card.rank)) {
            setSelectedCards(
                selectedCards.filter(
                    (c) => !(c.suit === card.suit && c.rank === card.rank)
                )
            );
        } else if (selectedCards.length < partnerCount) {
            const holdCount = myHand.filter(
                (c) => c.suit === card.suit && c.rank === card.rank
            ).length;
            // whichCopy only needed when leader holds 0 copies in 2-deck
            const whichCopy = is2Deck && holdCount === 0 ? 1 : null;
            setSelectedCards([...selectedCards, { ...card, whichCopy }]);
        }
    }

    function setCopyForCard(suit, rank, copyNum, e) {
        e.stopPropagation();
        setSelectedCards(
            selectedCards.map((c) =>
                c.suit === suit && c.rank === rank
                    ? { ...c, whichCopy: copyNum }
                    : c
            )
        );
    }

    function toggleSuitExpanded(suit) {
        setExpandedSuits((prev) => ({ ...prev, [suit]: !prev[suit] }));
    }

    const handleSubmitPartners = () => {
        const cards = selectedCards.map((c) => ({ suit: c.suit, rank: c.rank }));
        const specs = selectedCards
            .filter((c) => c.whichCopy !== null)
            .map((c) => ({
                card: { suit: c.suit, rank: c.rank },
                whichCopy: c.whichCopy === 1 ? "1st" : "2nd",
            }));
        WsSelectPartners(cards, specs);
    };

    // ── Phase 1: Suit picker ──────────────────────────────────────────
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

    // ── Phase 2: Partner card picker ─────────────────────────────────
    const activeSuit = powerHouseSuit || selectedSuit;
    const atLimit = selectedCards.length >= partnerCount;

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
                        Select Partner Cards ({selectedCards.length}/
                        {partnerCount})
                    </h3>

                    <div className="partner-card-picker">
                        {SUITS.map((suit) => {
                            const available = getAvailableCardsForSuit(suit);
                            if (available.length === 0) return null;

                            const isExpanded = expandedSuits[suit];
                            const preview = available.slice(0, 2);
                            const rest = available.slice(2);
                            const displayCards = isExpanded
                                ? available
                                : preview;

                            return (
                                <div key={suit} className="suit-group">
                                    <div
                                        className={`suit-group-header ${
                                            isRedSuit(suit) ? "red" : "black"
                                        }`}
                                    >
                                        <span className="suit-group-symbol">
                                            {suitSymbol(suit)}
                                        </span>
                                        <span className="suit-group-name">
                                            {SUIT_NAMES[suit]}
                                        </span>
                                    </div>

                                    <div className="suit-cards-row">
                                        {displayCards.map((card) => {
                                            const CardSvg =
                                                getCardComponent(card);
                                            const selected = isSelected(
                                                card.suit,
                                                card.rank
                                            );
                                            const selData = selected
                                                ? getSelectedCard(
                                                      card.suit,
                                                      card.rank
                                                  )
                                                : null;
                                            const showCopyBtns =
                                                selected &&
                                                is2Deck &&
                                                selData?.whichCopy !== null;
                                            const disabled =
                                                !selected && atLimit;

                                            return (
                                                <div
                                                    key={`${card.suit}${card.rank}`}
                                                    className={`partner-card-thumb${selected ? " selected" : ""}${disabled ? " disabled" : ""}${isRedSuit(suit) ? " red" : ""}`}
                                                    onClick={() =>
                                                        !disabled &&
                                                        toggleCard(card)
                                                    }
                                                    title={`${card.rank} of ${SUIT_NAMES[suit]}`}
                                                >
                                                    {CardSvg && (
                                                        <CardSvg
                                                            style={{
                                                                height: "100%",
                                                                width: "100%",
                                                            }}
                                                        />
                                                    )}
                                                    {showCopyBtns && (
                                                        <div className="copy-btns">
                                                            <button
                                                                className={`copy-btn${selData.whichCopy === 1 ? " active" : ""}`}
                                                                onClick={(e) =>
                                                                    setCopyForCard(
                                                                        card.suit,
                                                                        card.rank,
                                                                        1,
                                                                        e
                                                                    )
                                                                }
                                                                title="1st copy"
                                                            >
                                                                1
                                                            </button>
                                                            <button
                                                                className={`copy-btn${selData.whichCopy === 2 ? " active" : ""}`}
                                                                onClick={(e) =>
                                                                    setCopyForCard(
                                                                        card.suit,
                                                                        card.rank,
                                                                        2,
                                                                        e
                                                                    )
                                                                }
                                                                title="2nd copy"
                                                            >
                                                                2
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* More / collapse toggle */}
                                        {rest.length > 0 && !isExpanded && (
                                            <button
                                                className="suit-more-btn"
                                                onClick={() =>
                                                    toggleSuitExpanded(suit)
                                                }
                                                title={`Show ${rest.length} more`}
                                            >
                                                +{rest.length}
                                            </button>
                                        )}
                                        {isExpanded && rest.length > 0 && (
                                            <button
                                                className="suit-more-btn collapse"
                                                onClick={() =>
                                                    toggleSuitExpanded(suit)
                                                }
                                                title="Show fewer"
                                            >
                                                ▲
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedCards.length === partnerCount && (
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
        "4P1D": 1,
        "5P1D": 1,
        "6P1D": 2,
        "6P2D": 2,
        "7P2D": 2,
        "8P2D": 3,
        "9P2D": 3,
        "10P2D": 4,
    };
    return counts[configKey] || 1;
}

export default PowerHouseSelector;
