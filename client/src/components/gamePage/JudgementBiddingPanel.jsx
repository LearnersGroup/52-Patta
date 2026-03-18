import { useState, useEffect } from "react";
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

    // Auto-skip forbidden bid when it's my turn
    useEffect(() => {
        if (!isMyTurn) return;
        if (forbiddenBid === 0) {
            setAmount(1);
        } else if (amount === forbiddenBid) {
            setAmount((prev) => {
                const next = prev + 1;
                return next > cardsInRound ? Math.max(0, prev - 1) : next;
            });
        }
    }, [forbiddenBid, isMyTurn]); // eslint-disable-line react-hooks/exhaustive-deps

    const adjustAmount = (delta) => {
        setAmount((prev) => {
            let next = Math.max(0, Math.min(cardsInRound, prev + delta));
            // Jump over the forbidden bid
            if (forbiddenBid !== null && next === forbiddenBid) {
                next = Math.max(0, Math.min(cardsInRound, next + delta));
                if (next === forbiddenBid) next = prev; // nowhere to move, stay put
            }
            return next;
        });
    };

    const handleSubmit = () => {
        if (!isMyTurn) return;
        if (forbiddenBid !== null && amount === forbiddenBid) return;
        WsJudgementBid(amount);
    };

    if (!bidding) return null;

    return (
        <div className="bidding-controls-bar judgement-bidding-panel">
            {isMyTurn ? (
                <div className="judgement-bid-controls">
                    {forbiddenBid !== null && (
                        <div className="judgement-forbidden-note">
                            Cannot bid {forbiddenBid}
                        </div>
                    )}
                    <div className="jdg-bid-counter">
                        <button
                            className="jdg-bid-adj"
                            onClick={() => adjustAmount(-1)}
                            disabled={amount <= 0}
                        >
                            −
                        </button>
                        <span className="jdg-bid-amount">{amount}</span>
                        <button
                            className="jdg-bid-adj"
                            onClick={() => adjustAmount(1)}
                            disabled={amount >= cardsInRound}
                        >
                            +
                        </button>
                    </div>
                    <button className="btn-primary jdg-bid-submit" onClick={handleSubmit}>
                        Bid {amount}
                    </button>
                </div>
            ) : (
                <div className="judgement-bid-waiting">
                    <span className="judgement-bid-waiting-name">{getName(currentBidder)}</span>
                    <span className="judgement-bid-waiting-label"> is bidding...</span>
                </div>
            )}
        </div>
    );
};

export default JudgementBiddingPanel;
