/**
 * In-memory timer managers for Judgement game mode.
 * advanceTimers: used for scoreboard auto-advance and trump-announce auto-skip
 * bidTimers: used for per-player bid time limits
 */

const advanceTimers = new Map();
const bidTimers = new Map();

function scheduleJudgementAdvance(gameId, delayMs, onAdvance) {
    clearJudgementAdvance(gameId);
    const t = setTimeout(async () => {
        advanceTimers.delete(gameId);
        try { await onAdvance(); } catch (err) {
            console.error(`[judgementTimers] advance error for ${gameId}:`, err.message);
        }
    }, delayMs);
    advanceTimers.set(gameId, t);
}

function clearJudgementAdvance(gameId) {
    if (advanceTimers.has(gameId)) {
        clearTimeout(advanceTimers.get(gameId));
        advanceTimers.delete(gameId);
    }
}

function scheduleJudgementBidTimeout(gameId, delayMs, onTimeout) {
    clearJudgementBidTimeout(gameId);
    const t = setTimeout(async () => {
        bidTimers.delete(gameId);
        try { await onTimeout(); } catch (err) {
            console.error(`[judgementTimers] bid timeout error for ${gameId}:`, err.message);
        }
    }, delayMs);
    bidTimers.set(gameId, t);
}

function clearJudgementBidTimeout(gameId) {
    if (bidTimers.has(gameId)) {
        clearTimeout(bidTimers.get(gameId));
        bidTimers.delete(gameId);
    }
}

module.exports = {
    scheduleJudgementAdvance,
    clearJudgementAdvance,
    scheduleJudgementBidTimeout,
    clearJudgementBidTimeout,
};
