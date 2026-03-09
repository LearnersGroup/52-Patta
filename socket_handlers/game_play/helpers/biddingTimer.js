/**
 * In-memory bidding timer manager.
 * Stores one setTimeout reference per active game so that:
 *  - A new bid can cancel the old timer and start a fresh 15s window.
 *  - Phase transitions (powerhouse, reshuffling) can cancel the timer immediately.
 */

const timers = new Map(); // gameId → TimeoutId

/**
 * Start (or restart) the bidding expiry timer for a game.
 * Cancels any existing timer for the same game first.
 *
 * @param {string}   gameId   - Unique game identifier
 * @param {number}   delayMs  - Milliseconds until onExpire fires
 * @param {Function} onExpire - Async callback called when the timer fires
 */
function startBiddingTimer(gameId, delayMs, onExpire) {
    clearBiddingTimer(gameId);
    const t = setTimeout(async () => {
        timers.delete(gameId);
        try {
            await onExpire();
        } catch (err) {
            console.error(`[biddingTimer] expiry error for game ${gameId}:`, err.message);
        }
    }, delayMs);
    timers.set(gameId, t);
}

/**
 * Cancel the bidding timer for a game (e.g. on phase transition or server restart).
 *
 * @param {string} gameId
 */
function clearBiddingTimer(gameId) {
    if (timers.has(gameId)) {
        clearTimeout(timers.get(gameId));
        timers.delete(gameId);
    }
}

module.exports = { startBiddingTimer, clearBiddingTimer };
