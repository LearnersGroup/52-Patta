/**
 * In-memory grace-period tracker for lobby disconnects.
 *
 * When a player's socket drops while in the lobby, we delay removal
 * for `delayMs` (default 30 s). If they reconnect within that window
 * the pending removal is cancelled and the player stays in the room.
 */

const pending = new Map(); // key: playerId → { timeout, gameId }

/**
 * Schedule a player's removal from a lobby after `delayMs`.
 * @param {string} gameId
 * @param {string} playerId
 * @param {Function} callback — runs if the timer fires (player didn't reconnect)
 * @param {number}   delayMs  — grace window (default 30 000 ms)
 */
function scheduleLobbyDisconnect(gameId, playerId, callback, delayMs = 30000) {
    // If there's already a pending timer for this player, clear it first
    cancelLobbyDisconnect(playerId);

    const timeout = setTimeout(() => {
        pending.delete(playerId);
        callback();
    }, delayMs);

    pending.set(playerId, { timeout, gameId });
}

/**
 * Cancel a pending lobby disconnect for the given player.
 * @returns {string|null} the gameId the player was in, or null
 */
function cancelLobbyDisconnect(playerId) {
    const entry = pending.get(playerId);
    if (!entry) return null;

    clearTimeout(entry.timeout);
    pending.delete(playerId);
    return entry.gameId;
}

/**
 * Check whether a player has a pending lobby disconnect.
 */
function hasPendingDisconnect(playerId) {
    return pending.has(playerId);
}

module.exports = { scheduleLobbyDisconnect, cancelLobbyDisconnect, hasPendingDisconnect };
