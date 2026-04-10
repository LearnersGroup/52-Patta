/**
 * Abandoned Game Cleanup
 * ======================
 *
 * Handles the previously-unaddressed problem of active games that get
 * stranded in memory / MongoDB when all their players disconnect and
 * never come back.
 *
 * Two mechanisms:
 *
 *   1. Fast path — "all players disconnected" timer:
 *      When onDisconnect runs and no sockets remain in the room, schedule
 *      an abandonment after ABANDON_GRACE_MS (default 5 min). If any
 *      player reconnects the timer is cancelled.
 *
 *   2. Slow path — periodic stale-game sweep:
 *      Every SWEEP_INTERVAL_MS (default 15 min), scan activeGames and
 *      abandon any whose lastActivityAt is older than STALE_THRESHOLD_MS
 *      (default 6 h). Catches games missed by the fast path (e.g. server
 *      restart between disconnect and eviction).
 *
 * Abandonment performs:
 *   - Persist a partial GameRecord with status="abandoned"
 *   - Delete in-memory gameState
 *   - Reset Game.state → "lobby", clear gameState, reset ready flags
 *   - Notify any stragglers via io.to(roomname)
 */

const Game = require("../../models/Game");
const {
    getGameState,
    deleteGameState,
    listActiveGames,
} = require("../../game_engine/stateManager");
const { persistRecording } = require("../../game_engine/recording");

// ── Tunables ──────────────────────────────────────────────────────────────
const ABANDON_GRACE_MS = 5 * 60 * 1000;      // 5 minutes
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;    // 15 minutes
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

// Pending fast-path timers, keyed by gameId
const pendingAbandonment = new Map();

// Handle for the periodic sweep so we can clear it on shutdown
let sweepInterval = null;

/**
 * Count how many live sockets are currently in the given Socket.IO room.
 * Works with the default in-memory adapter used by this server.
 */
function countLiveSocketsInRoom(io, roomname) {
    if (!io || !roomname) return 0;
    try {
        const room = io.sockets.adapter.rooms.get(roomname);
        return room ? room.size : 0;
    } catch {
        return 0;
    }
}

/**
 * Abandon a single game. Persists a partial record (if the deal had any
 * meaningful progress), clears memory, resets the DB, and notifies the room.
 *
 * Safe to call even if the game was already cleaned up — becomes a no-op.
 */
async function abandonGame(io, gameId, reason) {
    const state = getGameState(gameId);
    if (!state) {
        // Already cleaned up by another path; cancel any pending timer and exit.
        cancelPending(gameId);
        return;
    }

    // 1. Save whatever partial analytics data we have. Best-effort.
    try {
        await persistRecording(state, {
            status: "abandoned",
            abandonReason: reason,
        });
    } catch (err) {
        console.error(
            `[abandon] persistRecording failed for ${gameId}:`,
            err.message
        );
    }

    // 2. Drop the in-memory state so the Map doesn't leak.
    deleteGameState(gameId);

    // 3. Reset the Game document back to lobby state so the room is usable.
    let roomname = null;
    try {
        const game = await Game.findById(gameId);
        if (game) {
            roomname = game.roomname;
            const resetPlayers = (game.players || []).map((p) => ({
                playerId: p.playerId,
                ready: false,
            }));
            await Game.findByIdAndUpdate(gameId, {
                state: "lobby",
                gameState: null,
                players: resetPlayers,
            });
        }
    } catch (err) {
        console.error(
            `[abandon] Game DB reset failed for ${gameId}:`,
            err.message
        );
    }

    // 4. Let any stragglers know. Emit both the lobby-reset event and a
    //    friendly message so clients can react naturally.
    if (io && roomname) {
        try {
            io.to(roomname).emit("game-quit");
            io.to(roomname).emit("fetch-users-in-room");
            io.to(roomname).emit(
                "room-message",
                "Game ended — all players disconnected."
            );
        } catch {
            /* ignore emit errors */
        }
    }

    cancelPending(gameId);
    console.info(
        `[abandon] Game ${gameId} abandoned (reason=${reason})`
    );
}

/**
 * Schedule an abandonment if the room is now empty. Called from onDisconnect
 * after a player drops during an active game. Idempotent — calling it twice
 * for the same game just reschedules.
 */
function scheduleAbandonmentIfEmpty(io, gameId, roomname) {
    if (!gameId) return;
    const live = countLiveSocketsInRoom(io, roomname);
    if (live > 0) {
        // At least one player is still present — cancel any stale timer.
        cancelPending(gameId);
        return;
    }

    // Clear any previous pending timer before scheduling a fresh one.
    cancelPending(gameId);

    const timeout = setTimeout(async () => {
        pendingAbandonment.delete(gameId);
        // Re-check liveness at fire time — a player may have rejoined.
        const liveNow = countLiveSocketsInRoom(io, roomname);
        if (liveNow > 0) return;
        await abandonGame(io, gameId, "all-disconnected");
    }, ABANDON_GRACE_MS);

    pendingAbandonment.set(gameId, timeout);
}

/**
 * Cancel a pending abandonment timer (e.g. because a player reconnected).
 */
function cancelPending(gameId) {
    const t = pendingAbandonment.get(gameId);
    if (t) {
        clearTimeout(t);
        pendingAbandonment.delete(gameId);
    }
}

/**
 * Periodic sweep — abandon any game whose lastActivityAt is older than the
 * stale threshold. Catches leaks from scenarios the fast-path timer can't
 * cover (server restart, missed disconnect event, etc.).
 */
async function sweepStaleGames(io) {
    const now = Date.now();
    const entries = listActiveGames();
    for (const [gameId, state] of entries) {
        const lastActive = state?.lastActivityAt || 0;
        if (!lastActive || now - lastActive >= STALE_THRESHOLD_MS) {
            try {
                await abandonGame(io, gameId, "stale-eviction");
            } catch (err) {
                console.error(
                    `[abandon sweep] failed for ${gameId}:`,
                    err.message
                );
            }
        }
    }
}

/**
 * Start the periodic sweep. Call once from server.js after io is created.
 * Returns the interval handle so the caller can clear it on shutdown.
 */
function startAbandonedGameSweeper(io, intervalMs = SWEEP_INTERVAL_MS) {
    if (sweepInterval) return sweepInterval;
    sweepInterval = setInterval(() => {
        sweepStaleGames(io).catch((err) =>
            console.error("[abandon sweep] error:", err.message)
        );
    }, intervalMs);
    // Don't keep the Node event loop alive just for this timer.
    if (sweepInterval.unref) sweepInterval.unref();
    return sweepInterval;
}

/**
 * Stop the periodic sweep and clear any pending fast-path timers.
 * Called from the graceful shutdown path in server.js.
 */
function stopAbandonedGameSweeper() {
    if (sweepInterval) {
        clearInterval(sweepInterval);
        sweepInterval = null;
    }
    for (const t of pendingAbandonment.values()) clearTimeout(t);
    pendingAbandonment.clear();
}

module.exports = {
    scheduleAbandonmentIfEmpty,
    cancelPending,
    abandonGame,
    sweepStaleGames,
    startAbandonedGameSweeper,
    stopAbandonedGameSweeper,
    // Exported for tests / monitoring
    _tunables: { ABANDON_GRACE_MS, SWEEP_INTERVAL_MS, STALE_THRESHOLD_MS },
};
