import { useState, useEffect } from "react";
import { WsPlaceBid, WsPassBid } from "../../api/wsEmitters";

/**
 * Open (non-sequential) bidding panel.
 * All active (non-passed) players can bid simultaneously during the window.
 * Props:
 *   bidding  – the bidding object from Redux game state
 *   userId   – the local player's ID
 *   getName  – function to resolve a player ID to a display name
 */
const BiddingPanel = ({ bidding, userId }) => {
    // ── Derived state ──────────────────────────────────────────────────────
    const now = Date.now();
    const biddingOpen = !!bidding?.biddingWindowOpensAt && now >= bidding.biddingWindowOpensAt;
    const hasPassed   = bidding?.passed?.includes(userId);
    const canBid      = biddingOpen && !hasPassed;

    const minBid = Math.max(
        (bidding?.currentBid || 0) + (bidding?.increment || 5),
        bidding?.startingBid || 150
    );

    // ── Local state ────────────────────────────────────────────────────────
    const [bidAmount, setBidAmount] = useState(minBid);
    // Countdown ticks (seconds left)
    const [, setTick] = useState(0);

    // Reset bid amount when the minimum changes (someone else raised the bid)
    useEffect(() => {
        setBidAmount((prev) => Math.max(prev, minBid));
    }, [minBid]);

    // Countdown ticker — rerenders every second
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 500);
        return () => clearInterval(interval);
    }, []);

    const handleBid = () => {
        if (!canBid) return;
        WsPlaceBid(bidAmount);
    };

    const handlePass = () => {
        if (!biddingOpen || hasPassed) return;
        WsPassBid();
    };

    if (!bidding) return null;
    // Timer is shown in the table center (BidCenterDisplay) — not here.

    return (
        <div className="bidding-controls-bar">

            {/* ── Controls (visible only when bidding is open and not passed) ── */}
            {canBid && (
                <div className="bidding-controls">
                    <div className="bid-input-group">
                        <button
                            className="bid-adjust"
                            onClick={() =>
                                setBidAmount((prev) =>
                                    Math.max(prev - (bidding.increment || 5), minBid)
                                )
                            }
                            disabled={bidAmount <= minBid}
                        >
                            −
                        </button>
                        <span className="bid-value">{bidAmount}</span>
                        <button
                            className="bid-adjust"
                            onClick={() =>
                                setBidAmount((prev) =>
                                    Math.min(prev + (bidding.increment || 5), bidding.maxBid || 500)
                                )
                            }
                            disabled={bidAmount >= (bidding.maxBid || 500)}
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

            {/* ── Passed message ─────────────────────────────────────────── */}
            {hasPassed && biddingOpen && (
                <div className="bidding-passed">You have passed</div>
            )}
        </div>
    );
};

export default BiddingPanel;
