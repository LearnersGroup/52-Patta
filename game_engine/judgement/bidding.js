function initJudgementBidding(seatOrder, dealerIndex) {
    const bidOrder = [];
    for (let i = 1; i <= seatOrder.length; i += 1) {
        bidOrder.push(seatOrder[(dealerIndex + i) % seatOrder.length]);
    }

    return {
        bids: {},
        bidOrder,
        currentBidderIndex: 0,
        biddingComplete: false,
        totalBids: 0,
    };
}

function placeJudgementBid(biddingState, playerId, amount, cardsInRound) {
    if (!biddingState || biddingState.biddingComplete) {
        return { error: "Bidding is already complete" };
    }

    const currentBidder = biddingState.bidOrder[biddingState.currentBidderIndex];
    if (currentBidder !== playerId) {
        return { error: "Not your turn to bid" };
    }

    const bidAmount = Number(amount);
    if (!Number.isInteger(bidAmount)) {
        return { error: "Bid must be an integer" };
    }

    if (bidAmount < 0 || bidAmount > cardsInRound) {
        return { error: `Bid must be between 0 and ${cardsInRound}` };
    }

    if (biddingState.bids[playerId] !== undefined) {
        return { error: "Player has already bid" };
    }

    const isLastBidder = biddingState.currentBidderIndex === biddingState.bidOrder.length - 1;
    if (isLastBidder) {
        const runningTotal = Object.values(biddingState.bids).reduce((sum, v) => sum + v, 0);
        if (runningTotal + bidAmount === cardsInRound) {
            return { error: `Dealer cannot bid ${cardsInRound - runningTotal}; total bids cannot equal ${cardsInRound}` };
        }
    }

    const bids = { ...biddingState.bids, [playerId]: bidAmount };
    const totalBids = biddingState.totalBids + bidAmount;
    const nextIndex = biddingState.currentBidderIndex + 1;
    const biddingComplete = nextIndex >= biddingState.bidOrder.length;

    return {
        state: {
            ...biddingState,
            bids,
            totalBids,
            biddingComplete,
            currentBidderIndex: biddingComplete ? biddingState.currentBidderIndex : nextIndex,
        },
    };
}

module.exports = {
    initJudgementBidding,
    placeJudgementBid,
};
