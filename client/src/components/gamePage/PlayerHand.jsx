import React from "react";
import { WsPlayCard } from "../../api/wsEmitters";
import { getCardComponent, cardKey, isCardInList } from "./utils/cardMapper";

const PlayerHand = ({ cards = [], validPlays = [], isMyTurn }) => {
    const handleCardClick = (card) => {
        if (!isMyTurn) return;
        if (!isCardInList(card, validPlays)) return;
        WsPlayCard(card);
    };

    // Sort by suit then rank for easier scanning
    const suitOrder = { S: 0, H: 1, D: 2, C: 3 };
    const rankOrder = {
        "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
        "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
    };
    const sorted = [...cards].sort((a, b) => {
        const sd = suitOrder[a.suit] - suitOrder[b.suit];
        if (sd !== 0) return sd;
        return rankOrder[a.rank] - rankOrder[b.rank];
    });

    return (
        <div className="player-hand-area">
            <div className="hand-label">Your Hand</div>
            <div className="hand-cards">
                {sorted.map((card) => {
                    const CardSvg = getCardComponent(card);
                    const isValid = isMyTurn && isCardInList(card, validPlays);
                    const isDisabled = isMyTurn && !isValid;

                    return (
                        <div
                            key={cardKey(card)}
                            className={`hand-card ${
                                isValid ? "playable" : ""
                            } ${isDisabled ? "disabled" : ""}`}
                            onClick={() => handleCardClick(card)}
                            title={`${card.rank} of ${card.suit}`}
                        >
                            {CardSvg && (
                                <CardSvg
                                    style={{ height: "100%", width: "100%" }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PlayerHand;
