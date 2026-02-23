/**
 * Initialize bidding state for a new game.
 */
function initBidding(config, seatOrder) {
    return {
        currentBid: 0,
        currentBidder: null,
        turnIndex: 0, // first player in seat order starts
        passes: [],
        startingBid: config.bidStart,
        biddingComplete: false,
    };
}

/**
 * Place a bid.
 * Returns { state } on success, or { error } on failure.
 */
function placeBid(biddingState, seatOrder, config, playerId, amount) {
    if (biddingState.biddingComplete) {
        return { error: "Bidding is already complete" };
    }

    // Validate it's this player's turn
    if (seatOrder[biddingState.turnIndex] !== playerId) {
        return { error: "Not your turn to bid" };
    }

    // Validate player hasn't already passed
    if (biddingState.passes.includes(playerId)) {
        return { error: "You have already passed" };
    }

    // Validate bid amount
    const minBid = biddingState.currentBid === 0
        ? biddingState.startingBid
        : biddingState.currentBid + config.bidIncrement;

    if (amount < minBid) {
        return { error: `Bid must be at least ${minBid}` };
    }

    if (amount > config.bidMax) {
        return { error: `Bid cannot exceed ${config.bidMax}` };
    }

    if (amount % config.bidIncrement !== 0) {
        return { error: `Bid must be a multiple of ${config.bidIncrement}` };
    }

    const newState = {
        ...biddingState,
        currentBid: amount,
        currentBidder: playerId,
        turnIndex: getNextBidderIndex(seatOrder, biddingState.turnIndex, biddingState.passes),
    };

    // If bid is the max, bidding ends immediately
    if (amount === config.bidMax) {
        newState.biddingComplete = true;
    }

    return { state: newState };
}

/**
 * Pass on bidding.
 * Returns { state, allPassed } where allPassed is true if everyone passed this round.
 */
function passBid(biddingState, seatOrder, config, playerId) {
    if (biddingState.biddingComplete) {
        return { error: "Bidding is already complete" };
    }

    if (seatOrder[biddingState.turnIndex] !== playerId) {
        return { error: "Not your turn to bid" };
    }

    if (biddingState.passes.includes(playerId)) {
        return { error: "You have already passed" };
    }

    const newPasses = [...biddingState.passes, playerId];
    const activePlayers = seatOrder.filter((id) => !newPasses.includes(id));

    // If only one player hasn't passed and someone has bid, bidding is complete
    if (activePlayers.length === 1 && biddingState.currentBidder !== null) {
        return {
            state: {
                ...biddingState,
                passes: newPasses,
                biddingComplete: true,
            },
        };
    }

    // If everyone passed (no one has bid yet), re-deal
    if (activePlayers.length === 0 && biddingState.currentBidder === null) {
        return { redeal: true };
    }

    return {
        state: {
            ...biddingState,
            passes: newPasses,
            turnIndex: getNextBidderIndex(seatOrder, biddingState.turnIndex, newPasses),
        },
    };
}

/**
 * Get the index of the next active bidder (skipping passed players).
 */
function getNextBidderIndex(seatOrder, currentIndex, passes) {
    const len = seatOrder.length;
    let nextIndex = (currentIndex + 1) % len;
    let attempts = 0;

    while (passes.includes(seatOrder[nextIndex]) && attempts < len) {
        nextIndex = (nextIndex + 1) % len;
        attempts++;
    }

    return nextIndex;
}

/**
 * Get the bid winner (leader) from completed bidding state.
 */
function getBidWinner(biddingState) {
    if (!biddingState.biddingComplete) return null;
    return biddingState.currentBidder;
}

module.exports = {
    initBidding,
    placeBid,
    passBid,
    getBidWinner,
};
