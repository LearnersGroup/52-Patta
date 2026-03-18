import { memo } from "react";
import { WsShuffleAction, WsUndoShuffle, WsDeal } from "../../api/wsEmitters";

const MAX_SHUFFLE_OPS = 5;

const ShufflingPanel = memo(({
    dealer,
    userId,
    shuffleQueue = [],
    getName = (pid) => pid?.substring(0, 8),
    currentGameNumber,
    totalGames,
    isTableCenter = false,
    gameLabel = "Game",
}) => {
    const isDealer = dealer === userId;
    const dealerName = getName(dealer);
    const queueLength = shuffleQueue.length;
    const canShuffle = queueLength < MAX_SHUFFLE_OPS;
    const canDeal = queueLength > 0;

    const handleShuffle = (type) => {
        if (!canShuffle) return;
        WsShuffleAction(type);
    };

    const handleUndo = () => {
        if (queueLength === 0) return;
        WsUndoShuffle();
    };

    const handleDeal = () => {
        if (!canDeal) return;
        WsDeal();
    };

    const shuffleTypeLabels = {
        riffle: "Riffle",
        hindu: "Hindu",
        overhand: "Overhand",
    };

    const shuffleTypeIcons = {
        riffle: "♠",
        hindu: "♥",
        overhand: "♦",
    };

    const wrapperClass = isTableCenter
        ? `shuffling-center-content ${isDealer ? "dealer-view" : "spectator-view"}`
        : `shuffling-panel ${isDealer ? "dealer-view" : "spectator-view"}`;

    if (isDealer) {
        return (
            <div className={wrapperClass}>
                <div className="shuffling-header">
                    <h3>{isTableCenter ? "Choose your Shuffles" : "🃏 You are the Dealer"}</h3>
                    {totalGames > 1 && (
                        <div className="game-counter">
                            {gameLabel} {currentGameNumber} of {totalGames}
                        </div>
                    )}
                </div>

                <div className="shuffle-buttons">
                    {["riffle", "hindu", "overhand"].map((type) => (
                        <button
                            key={type}
                            className={`shuffle-btn shuffle-${type}`}
                            onClick={() => handleShuffle(type)}
                            disabled={!canShuffle}
                        >
                            <span className="shuffle-icon">
                                {shuffleTypeIcons[type]}
                            </span>
                            <span className="shuffle-label">
                                {shuffleTypeLabels[type]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="shuffle-queue-section">
                    <div className="queue-header">
                        <span className="queue-count">
                            {queueLength} / {MAX_SHUFFLE_OPS} shuffles
                        </span>
                    </div>
                    <div className="shuffle-queue">
                        {shuffleQueue.map((op, idx) => (
                            <div key={idx} className="shuffle-chip">
                                <span className="chip-icon">
                                    {shuffleTypeIcons[op.type]}
                                </span>
                                <span className="chip-label">
                                    {shuffleTypeLabels[op.type]}
                                </span>
                                {idx === queueLength - 1 && (
                                    <button
                                        className="chip-undo"
                                        onClick={handleUndo}
                                        title="Undo"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        {queueLength === 0 && (
                            <div className="queue-empty">
                                Select a shuffle type to begin
                            </div>
                        )}
                    </div>
                </div>

                <div className="deal-buttons">
                    <button
                        className="deal-btn deal-normal"
                        onClick={handleDeal}
                        disabled={!canDeal}
                    >
                        Deal
                    </button>
                </div>
            </div>
        );
    }

    // Non-dealer view
    return (
        <div className={wrapperClass}>
            <div className="shuffling-header">
                <h3>{isTableCenter ? `${dealerName} is dealing` : `🃏 ${dealerName} is the Dealer`}</h3>
                {totalGames > 1 && (
                    <div className="game-counter">
                        Game {currentGameNumber} of {totalGames}
                    </div>
                )}
            </div>
            <div className="shuffle-status">
                {queueLength === 0 ? (
                    <div className="waiting-text">
                        Waiting for the dealer to shuffle...
                    </div>
                ) : (
                    <div className="shuffle-progress">
                        <div className="shuffle-progress-text">
                            {queueLength} shuffle{queueLength !== 1 ? "s" : ""} queued
                        </div>
                        <div className="shuffle-queue spectator-queue">
                            {shuffleQueue.map((op, idx) => (
                                <div key={idx} className="shuffle-chip small">
                                    <span className="chip-icon">
                                        {shuffleTypeIcons[op.type]}
                                    </span>
                                    <span className="chip-label">
                                        {shuffleTypeLabels[op.type]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

ShufflingPanel.displayName = "ShufflingPanel";

export default ShufflingPanel;
