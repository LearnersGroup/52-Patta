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

    // When it becomes my turn, if the currently-selected amount happens to be
    // forbidden, nudge it to the nearest valid value. Only runs on turn
    // transitions — user can freely pick any valid bid after that.
    useEffect(() => {
        if (!isMyTurn) return;
        setAmount((prev) => {
            if (forbiddenBid !== null && prev === forbiddenBid) {
                return forbiddenBid === 0 ? 1 : 0;
            }
            return prev;
        });
    }, [isMyTurn, forbiddenBid]);

    const adjustAmount = (delta) => {
        setAmount((prev) => Math.max(0, Math.min(cardsInRound, prev + delta)));
    };

    const isForbidden = forbiddenBid !== null && amount === forbiddenBid;

    const handleSubmit = () => {
        if (!isMyTurn || isForbidden) return;
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
                    <button
                        className="btn-primary jdg-bid-submit"
                        onClick={handleSubmit}
                        disabled={isForbidden}
                    >
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
