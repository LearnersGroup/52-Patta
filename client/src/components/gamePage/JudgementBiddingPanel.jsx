import { useMemo, useState, useEffect } from "react";
import { WsJudgementBid } from "../../api/wsEmitters";

const JudgementBiddingPanel = ({ bidding, userId, cardsInRound = 0, getName = (pid) => pid?.substring(0, 8) }) => {
    const bidOrder = bidding?.bidOrder || [];
    const currentBidderIndex = bidding?.currentBidderIndex ?? 0;
    const currentBidder = bidOrder[currentBidderIndex] || null;
    const isMyTurn = currentBidder === userId;

    const totalBidsSoFar = bidding?.totalBids || 0;
    const isDealerTurn = currentBidderIndex === bidOrder.length - 1;
    const forbiddenBid = isDealerTurn ? cardsInRound - totalBidsSoFar : null;

    const [amount, setAmount] = useState(0);

    useEffect(() => {
        if (forbiddenBid === amount && isMyTurn) {
            setAmount(0);
        }
    }, [forbiddenBid, amount, isMyTurn]);

    const amountOptions = useMemo(() => {
        const opts = [];
        for (let i = 0; i <= cardsInRound; i += 1) {
            opts.push(i);
        }
        return opts;
    }, [cardsInRound]);

    const handleSubmit = () => {
        if (!isMyTurn) return;
        if (forbiddenBid !== null && amount === forbiddenBid) return;
        WsJudgementBid(amount);
    };

    if (!bidding) return null;

    return (
        <div className="bidding-controls-bar judgement-bidding-panel">
            <div className="judgement-bid-order">
                {bidOrder.map((pid, idx) => {
                    const bid = bidding?.bids?.[pid];
                    const isCurrent = idx === currentBidderIndex && !bidding?.biddingComplete;
                    return (
                        <div key={pid} className={`judgement-bid-row ${isCurrent ? "is-current" : ""}`}>
                            <span className="judgement-bid-player">{getName(pid)}</span>
                            <span className="judgement-bid-value">{bid ?? "—"}</span>
                        </div>
                    );
                })}
            </div>

            <div className="judgement-bid-meta">
                Total bids: <strong>{totalBidsSoFar}</strong> / {cardsInRound}
                {isDealerTurn && forbiddenBid !== null && (
                    <span className="judgement-forbidden"> Dealer cannot bid {forbiddenBid}</span>
                )}
            </div>

            {isMyTurn && (
                <div className="judgement-bid-controls">
                    <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
                        {amountOptions.map((opt) => (
                            <option key={opt} value={opt} disabled={forbiddenBid === opt}>
                                {opt}{forbiddenBid === opt ? " (not allowed)" : ""}
                            </option>
                        ))}
                    </select>
                    <button className="btn-primary" onClick={handleSubmit}>
                        Submit Bid
                    </button>
                </div>
            )}
        </div>
    );
};

export default JudgementBiddingPanel;
