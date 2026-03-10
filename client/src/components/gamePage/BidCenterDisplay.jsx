import { memo, useState, useEffect } from "react";

const BidCenterDisplay = memo(({ bidding, getName = (pid) => pid?.substring(0, 8) }) => {
    // ── Tick to keep countdown live ────────────────────────────────────────
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 500);
        return () => clearInterval(interval);
    }, []);

    // ── Derived timing ─────────────────────────────────────────────────────
    const nowMs       = Date.now();
    const biddingOpen = !!bidding?.biddingWindowOpensAt && nowMs >= bidding.biddingWindowOpensAt;

    const revealSecsLeft = bidding?.biddingWindowOpensAt
        ? Math.max(0, Math.ceil((bidding.biddingWindowOpensAt - nowMs) / 1000))
        : 0;

    const biddingSecsLeft = bidding?.biddingExpiresAt
        ? Math.max(0, Math.ceil((bidding.biddingExpiresAt - nowMs) / 1000))
        : 0;

    const isUrgent = biddingOpen && biddingSecsLeft <= 5;

    return (
        <div className="bid-center-display">

            {/* ── Timer ──────────────────────────────────────────────── */}
            <div className={`bid-center-timer ${isUrgent ? "bid-center-timer--urgent" : ""}`}>
                {!biddingOpen ? (
                    <span className="bid-center-timer-text">
                        ⏳ Opens in <strong>{revealSecsLeft}s</strong>
                    </span>
                ) : (
                    <span className="bid-center-timer-text">
                        ⏱ <strong className={isUrgent ? "bid-center-countdown--urgent" : ""}>
                            {biddingSecsLeft}s
                        </strong>
                    </span>
                )}
            </div>

            {/* ── Current bid ────────────────────────────────────────── */}
            <div className="bid-center-label">Current Bid</div>
            <div className="bid-center-amount">
                {bidding?.currentBid || "—"}
            </div>
            <div className="bid-center-bidder">
                {bidding?.currentBidder
                    ? <>by <span className="bid-center-bidder-name">{getName(bidding.currentBidder)}</span></>
                    : "No bids yet"
                }
            </div>

        </div>
    );
});

BidCenterDisplay.displayName = "BidCenterDisplay";

export default BidCenterDisplay;
