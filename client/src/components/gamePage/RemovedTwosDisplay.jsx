import React from "react";
import { getCardComponent, cardKey } from "./utils/cardMapper";

const RemovedTwosDisplay = ({ cards = [] }) => {
    if (cards.length === 0) return null;

    return (
        <div className="removed-twos">
            <span className="removed-label">Removed 2s:</span>
            <div className="removed-cards">
                {cards.map((card) => {
                    const CardSvg = getCardComponent(card);
                    return (
                        <div key={cardKey(card)} className="removed-card">
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

export default RemovedTwosDisplay;
