const timers = new Map();

function scheduleMendikotNextRound(gameId, delayMs, onAdvance) {
    clearMendikotNextRound(gameId);
    const t = setTimeout(async () => {
        timers.delete(gameId);
        try { await onAdvance(); } catch (err) {
            console.error(`[mendikotTimers] next round error for ${gameId}:`, err.message);
        }
    }, delayMs);
    timers.set(gameId, t);
}

function clearMendikotNextRound(gameId) {
    if (timers.has(gameId)) {
        clearTimeout(timers.get(gameId));
        timers.delete(gameId);
    }
}

module.exports = { scheduleMendikotNextRound, clearMendikotNextRound };
