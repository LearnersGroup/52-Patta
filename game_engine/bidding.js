/**
 * Non-sequential (open) bidding engine.
 * Any active (non-passed) player may bid at any time during the bidding window.
 * A player may bid multiple times — each new bid must exceed the current highest.
 * Timestamps (biddingWindowOpensAt, biddingExpiresAt) are injected by dealCardsHandler
 * after transitioning to the "bidding" phase.
 */

/**
 * Initialize bidding state for a new game.
 * Timestamps are null until the server switches to "bidding" phase.
 */
function initBidding(config, seatOrder) {
    return {
        currentBid: 0,
        currentBidder: null,
        passes: [],
        startingBid: config.bidStart,
        biddingComplete: false,
        biddingWindowOpensAt: null,
        biddingExpiresAt: null,
    };
}

/**
 * Place a bid (open / non-sequential).
 * Any active (non-passed) player may bid as long as the amount exceeds the current highest.
 * Returns { state } on success, { error } on failure.
 */
function placeBid(biddingState, seatOrder, config, playerId, amount) {
    if (biddingState.biddingComplete) {
        return { error: "Bidding is already complete" };
    }

    if (!seatOrder.includes(playerId)) {
        return { error: "Player is not in this game" };
    }

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
    };

    // Hitting the max bid ends bidding immediately
    if (amount === config.bidMax) {
        newState.biddingComplete = true;
    }

    return { state: newState };
}

/**
 * Pass on bidding (open / non-sequential).
 * Once passed a player may not bid again.
 * Returns { state }, { state } with biddingComplete: true, or { redeal: true }.
 */
function passBid(biddingState, seatOrder, config, playerId) {
    if (biddingState.biddingComplete) {
        return { error: "Bidding is already complete" };
    }

    if (!seatOrder.includes(playerId)) {
        return { error: "Player is not in this game" };
    }

    if (biddingState.passes.includes(playerId)) {
        return { error: "You have already passed" };
    }

    const newPasses = [...biddingState.passes, playerId];
    const activePlayers = seatOrder.filter((id) => !newPasses.includes(id));

    // Everyone passed with no bids → reshuffle (same dealer)
    if (activePlayers.length === 0 && biddingState.currentBidder === null) {
        return { redeal: true };
    }

    // One or zero active players left and someone has bid → bidding complete
    if (activePlayers.length <= 1 && biddingState.currentBidder !== null) {
        return {
            state: {
                ...biddingState,
                passes: newPasses,
                biddingComplete: true,
            },
        };
    }

    return {
        state: {
            ...biddingState,
            passes: newPasses,
        },
    };
}

/**
 * Resolve an expired bidding timer.
 * Returns { winner: playerId } if someone bid, or { redeal: true } if nobody bid.
 */
function resolveBiddingExpiry(biddingState) {
    if (biddingState.currentBidder) {
        return { winner: biddingState.currentBidder };
    }
    return { redeal: true };
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
    resolveBiddingExpiry,
    getBidWinner,
};
