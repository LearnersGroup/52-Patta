import React, { useState } from "react";
import { WsPlaceBid, WsPassBid } from "../../api/wsEmitters";

const BiddingPanel = ({ bidding, userId, isMyTurn, getName = (pid) => pid?.substring(0, 8) }) => {
    const minBid = Math.max(
        bidding?.currentBid + (bidding?.increment || 5),
        bidding?.startingBid || 150
    );
    const [bidAmount, setBidAmount] = useState(minBid);

    // Update default when minBid changes
    React.useEffect(() => {
        setBidAmount(minBid);
    }, [minBid]);

    const handleBid = () => {
        if (!isMyTurn) return;
        WsPlaceBid(bidAmount);
    };

    const handlePass = () => {
        if (!isMyTurn) return;
        WsPassBid();
    };

    const hasPassed = bidding?.passed?.includes(userId);

    return (
        <div className="bidding-panel">
            <div className="bidding-header">
                <h3>Bidding Phase</h3>
                <div className="current-bid-display">
                    <span className="bid-label">Current Bid</span>
                    <span className="bid-amount">
                        {bidding?.currentBid || "None"}
                    </span>
                    {bidding?.highestBidder && (
                        <span className="bid-leader-label">
                            by {getName(bidding.highestBidder)}
                        </span>
                    )}
                </div>
            </div>

            {isMyTurn && !hasPassed && (
                <div className="bidding-controls">
                    <div className="bid-input-group">
                        <button
                            className="bid-adjust"
                            onClick={() =>
                                setBidAmount((prev) =>
                                    Math.max(prev - (bidding?.increment || 5), minBid)
                                )
                            }
                            disabled={bidAmount <= minBid}
                        >
                            -
                        </button>
                        <span className="bid-value">{bidAmount}</span>
                        <button
                            className="bid-adjust"
                            onClick={() =>
                                setBidAmount((prev) =>
                                    Math.min(
                                        prev + (bidding?.increment || 5),
                                        bidding?.maxBid || 500
                                    )
                                )
                            }
                            disabled={bidAmount >= (bidding?.maxBid || 500)}
                        >
                            +
                        </button>
                    </div>
                    <div className="bid-actions">
                        <button className="btn-primary" onClick={handleBid}>
                            Bid {bidAmount}
                        </button>
                        <button className="btn-secondary" onClick={handlePass}>
                            Pass
                        </button>
                    </div>
                </div>
            )}

            {hasPassed && (
                <div className="bidding-passed">You have passed</div>
            )}

            {!isMyTurn && !hasPassed && (
                <div className="bidding-waiting">
                    Waiting for other players...
                </div>
            )}
        </div>
    );
};

export default BiddingPanel;
