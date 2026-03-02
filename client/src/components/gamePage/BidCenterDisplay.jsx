const BidCenterDisplay = ({ bidding, getName = (pid) => pid?.substring(0, 8) }) => {
    return (
        <div className="bid-center-display">
            <div className="bid-center-label">Current Bid</div>
            <div className="bid-center-amount">
                {bidding?.currentBid || "—"}
            </div>
            {bidding?.highestBidder && (
                <div className="bid-center-bidder">
                    by {getName(bidding.highestBidder)}
                </div>
            )}
            {!bidding?.highestBidder && (
                <div className="bid-center-bidder">
                    No bids yet
                </div>
            )}
        </div>
    );
};

export default BidCenterDisplay;
