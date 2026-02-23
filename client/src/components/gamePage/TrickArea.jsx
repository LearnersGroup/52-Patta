import React from "react";
import { getCardComponent, cardKey, suitSymbol, isRedSuit } from "./utils/cardMapper";

const TrickArea = ({
    currentTrick,
    seatOrder,
    powerHouseSuit,
    currentRound,
    getName = (pid) => pid?.substring(0, 8),
}) => {
    const cards = currentTrick?.plays || [];

    return (
        <div className="trick-area">
            <div className="trick-header">
                <span className="round-label">Round {currentRound + 1}</span>
                {powerHouseSuit && (
                    <span
                        className={`powerhouse-badge ${
                            isRedSuit(powerHouseSuit) ? "red" : "black"
                        }`}
                    >
                        PowerHouse: {suitSymbol(powerHouseSuit)}
                    </span>
                )}
            </div>
            <div className="trick-cards">
                {cards.map((play) => {
                    const CardSvg = getCardComponent(play.card);
                    return (
                        <div
                            key={cardKey(play.card)}
                            className="trick-card-slot"
                        >
                            <div className="trick-card">
                                {CardSvg && (
                                    <CardSvg
                                        style={{
                                            height: "100%",
                                            width: "100%",
                                        }}
                                    />
                                )}
                            </div>
                            <div className="trick-player-label">
                                {getName(play.playerId)}
                            </div>
                        </div>
                    );
                })}
                {cards.length === 0 && (
                    <div className="trick-empty">
                        Waiting for cards to be played...
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrickArea;
