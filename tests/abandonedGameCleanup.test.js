/**
 * Unit tests for socket_handlers/extra/abandonedGameCleanup.js
 *
 * All external dependencies are mocked so these tests run without a DB or
 * live Socket.IO server. The goal is to verify behavior of the three public
 * entry points:
 *   - scheduleAbandonmentIfEmpty: fast-path timer on disconnect
 *   - cancelPending:              cancellation on reconnect
 *   - abandonGame:                the actual cleanup action
 *   - sweepStaleGames:            periodic slow-path sweep
 *
 * The module holds a Node timer-backed Map of pending timers, so tests use
 * jest.useFakeTimers() to advance time deterministically.
 */

jest.mock("../models/Game", () => ({
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
}));

jest.mock("../game_engine/stateManager", () => ({
    getGameState: jest.fn(),
    deleteGameState: jest.fn(),
    listActiveGames: jest.fn(),
    markActivity: jest.fn(),
}));

jest.mock("../game_engine/recording", () => ({
    persistRecording: jest.fn(),
}));

const Game = require("../models/Game");
const {
    getGameState,
    deleteGameState,
    listActiveGames,
} = require("../game_engine/stateManager");
const { persistRecording } = require("../game_engine/recording");

const {
    scheduleAbandonmentIfEmpty,
    cancelPending,
    abandonGame,
    sweepStaleGames,
    _tunables,
} = require("../socket_handlers/extra/abandonedGameCleanup");

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a fake Socket.IO-ish `io` whose room size can be controlled per test. */
function makeFakeIo({ roomSize = 0 } = {}) {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    return {
        to,
        _emit: emit,
        sockets: {
            adapter: {
                rooms: {
                    get: () => (roomSize > 0 ? { size: roomSize } : undefined),
                },
            },
        },
    };
}

function makeGameState(overrides = {}) {
    return {
        gameId: "game-1",
        roomname: "room-1",
        phase: "playing",
        lastActivityAt: Date.now(),
        recording: {
            startedAt: Date.now() - 1000,
            bidding: { bidEvents: [{ type: "bid" }], judgementBids: {} },
            tricks: [{ winner: "p1" }],
        },
        ...overrides,
    };
}

function makeDbGame() {
    return {
        _id: "game-1",
        roomname: "room-1",
        players: [
            { playerId: "p1", ready: true },
            { playerId: "p2", ready: true },
        ],
    };
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe("abandonedGameCleanup", () => {
    let infoSpy;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();

        // Default: DB returns a usable game
        Game.findById.mockResolvedValue(makeDbGame());
        Game.findByIdAndUpdate.mockResolvedValue({});
        persistRecording.mockResolvedValue("record-id");

        // Suppress the informational "[abandon] Game X abandoned" logs
        infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.useRealTimers();
        infoSpy.mockRestore();
    });

    // ── scheduleAbandonmentIfEmpty ────────────────────────────────────────

    describe("scheduleAbandonmentIfEmpty", () => {
        test("does nothing while at least one socket remains in the room", () => {
            const io = makeFakeIo({ roomSize: 1 });
            scheduleAbandonmentIfEmpty(io, "game-1", "room-1");

            // Advance past the grace period — should not trigger anything
            jest.advanceTimersByTime(_tunables.ABANDON_GRACE_MS + 1000);

            expect(persistRecording).not.toHaveBeenCalled();
            expect(deleteGameState).not.toHaveBeenCalled();
        });

        test("fires abandonGame after the grace period if room stays empty", async () => {
            getGameState.mockReturnValue(makeGameState());
            const io = makeFakeIo({ roomSize: 0 });

            scheduleAbandonmentIfEmpty(io, "game-1", "room-1");

            // Not yet — still within grace window
            jest.advanceTimersByTime(_tunables.ABANDON_GRACE_MS - 1000);
            expect(persistRecording).not.toHaveBeenCalled();

            // Cross the threshold; let scheduled microtasks flush.
            jest.advanceTimersByTime(2000);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();

            expect(persistRecording).toHaveBeenCalledWith(
                expect.objectContaining({ gameId: "game-1" }),
                { status: "abandoned", abandonReason: "all-disconnected" }
            );
            expect(deleteGameState).toHaveBeenCalledWith("game-1");
            expect(Game.findByIdAndUpdate).toHaveBeenCalledWith(
                "game-1",
                expect.objectContaining({ state: "lobby", gameState: null })
            );
        });

        test("re-checks liveness when the timer fires and bails if someone rejoined", async () => {
            getGameState.mockReturnValue(makeGameState());

            // Room starts empty → timer is scheduled
            const io = makeFakeIo({ roomSize: 0 });
            scheduleAbandonmentIfEmpty(io, "game-1", "room-1");

            // Before the timer fires, a player rejoins: flip the adapter
            io.sockets.adapter.rooms.get = () => ({ size: 1 });

            jest.advanceTimersByTime(_tunables.ABANDON_GRACE_MS + 1000);
            await Promise.resolve();

            // Abandonment should have been skipped
            expect(persistRecording).not.toHaveBeenCalled();
            expect(deleteGameState).not.toHaveBeenCalled();
        });

        test("reschedules cleanly if called twice (doesn't double-fire)", async () => {
            getGameState.mockReturnValue(makeGameState());
            const io = makeFakeIo({ roomSize: 0 });

            scheduleAbandonmentIfEmpty(io, "game-1", "room-1");
            // Half-way through the window, call again — the old timer must
            // be cleared so the handler only runs once.
            jest.advanceTimersByTime(_tunables.ABANDON_GRACE_MS / 2);
            scheduleAbandonmentIfEmpty(io, "game-1", "room-1");

            jest.advanceTimersByTime(_tunables.ABANDON_GRACE_MS + 1000);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();

            expect(persistRecording).toHaveBeenCalledTimes(1);
            expect(deleteGameState).toHaveBeenCalledTimes(1);
        });
    });

    // ── cancelPending ─────────────────────────────────────────────────────

    describe("cancelPending", () => {
        test("cancels a pending abandonment so it never fires", async () => {
            getGameState.mockReturnValue(makeGameState());
            const io = makeFakeIo({ roomSize: 0 });

            scheduleAbandonmentIfEmpty(io, "game-1", "room-1");
            // Player reconnects mid-grace → onConnect calls cancelPending
            cancelPending("game-1");

            jest.advanceTimersByTime(_tunables.ABANDON_GRACE_MS + 5000);
            await Promise.resolve();

            expect(persistRecording).not.toHaveBeenCalled();
            expect(deleteGameState).not.toHaveBeenCalled();
        });

        test("is a no-op for an unknown gameId", () => {
            expect(() => cancelPending("not-a-game")).not.toThrow();
        });
    });

    // ── abandonGame ───────────────────────────────────────────────────────

    describe("abandonGame", () => {
        test("persists partial record, clears memory, resets DB, notifies room", async () => {
            getGameState.mockReturnValue(makeGameState());
            const io = makeFakeIo();

            await abandonGame(io, "game-1", "all-disconnected");

            expect(persistRecording).toHaveBeenCalledWith(
                expect.objectContaining({ gameId: "game-1" }),
                { status: "abandoned", abandonReason: "all-disconnected" }
            );
            expect(deleteGameState).toHaveBeenCalledWith("game-1");
            expect(Game.findByIdAndUpdate).toHaveBeenCalledWith(
                "game-1",
                expect.objectContaining({
                    state: "lobby",
                    gameState: null,
                    players: [
                        { playerId: "p1", ready: false },
                        { playerId: "p2", ready: false },
                    ],
                })
            );
            expect(io.to).toHaveBeenCalledWith("room-1");
            // Both game-quit + room-message should have been emitted
            expect(io._emit).toHaveBeenCalledWith("game-quit");
            expect(io._emit).toHaveBeenCalledWith(
                "room-message",
                expect.stringContaining("disconnected")
            );
        });

        test("no-ops when the game has already been cleaned up", async () => {
            getGameState.mockReturnValue(null);
            const io = makeFakeIo();

            await abandonGame(io, "game-1", "all-disconnected");

            expect(persistRecording).not.toHaveBeenCalled();
            expect(deleteGameState).not.toHaveBeenCalled();
            expect(Game.findByIdAndUpdate).not.toHaveBeenCalled();
        });

        test("continues cleanup even if persistRecording throws", async () => {
            getGameState.mockReturnValue(makeGameState());
            persistRecording.mockRejectedValueOnce(new Error("mongo down"));
            const io = makeFakeIo();

            // Silence the expected error log
            const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

            await expect(
                abandonGame(io, "game-1", "all-disconnected")
            ).resolves.toBeUndefined();

            // Memory + DB + notify still happen
            expect(deleteGameState).toHaveBeenCalledWith("game-1");
            expect(Game.findByIdAndUpdate).toHaveBeenCalled();

            errSpy.mockRestore();
        });

        test("continues cleanup even if Game.findById throws", async () => {
            getGameState.mockReturnValue(makeGameState());
            Game.findById.mockRejectedValueOnce(new Error("mongo down"));
            const io = makeFakeIo();

            const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

            await expect(
                abandonGame(io, "game-1", "all-disconnected")
            ).resolves.toBeUndefined();

            // Recording + memory-free still happen even if we never got the roomname
            expect(persistRecording).toHaveBeenCalled();
            expect(deleteGameState).toHaveBeenCalledWith("game-1");

            errSpy.mockRestore();
        });
    });

    // ── sweepStaleGames ───────────────────────────────────────────────────

    describe("sweepStaleGames", () => {
        test("abandons games idle longer than the stale threshold", async () => {
            const now = Date.now();
            const freshState = makeGameState({
                gameId: "fresh",
                roomname: "room-fresh",
                lastActivityAt: now - 1000, // 1 s ago
            });
            const staleState = makeGameState({
                gameId: "stale",
                roomname: "room-stale",
                lastActivityAt: now - (_tunables.STALE_THRESHOLD_MS + 60000),
            });

            listActiveGames.mockReturnValue([
                ["fresh", freshState],
                ["stale", staleState],
            ]);
            getGameState.mockImplementation((id) =>
                id === "fresh" ? freshState : staleState
            );
            Game.findById.mockImplementation((id) =>
                Promise.resolve({
                    _id: id,
                    roomname: id === "fresh" ? "room-fresh" : "room-stale",
                    players: [{ playerId: "p1", ready: true }],
                })
            );

            const io = makeFakeIo();
            await sweepStaleGames(io);

            // The stale one was abandoned
            expect(persistRecording).toHaveBeenCalledWith(
                expect.objectContaining({ gameId: "stale" }),
                expect.objectContaining({ abandonReason: "stale-eviction" })
            );
            expect(deleteGameState).toHaveBeenCalledWith("stale");

            // The fresh one was left alone
            expect(deleteGameState).not.toHaveBeenCalledWith("fresh");
        });

        test("treats games without lastActivityAt as stale", async () => {
            const noTimestamp = makeGameState({
                gameId: "no-ts",
                roomname: "room-no-ts",
                lastActivityAt: undefined,
            });
            listActiveGames.mockReturnValue([["no-ts", noTimestamp]]);
            getGameState.mockReturnValue(noTimestamp);
            Game.findById.mockResolvedValue({
                _id: "no-ts",
                roomname: "room-no-ts",
                players: [],
            });

            const io = makeFakeIo();
            await sweepStaleGames(io);

            expect(deleteGameState).toHaveBeenCalledWith("no-ts");
        });

        test("keeps sweeping even if one game's abandonment throws", async () => {
            const now = Date.now();
            const bad = makeGameState({
                gameId: "bad",
                roomname: "room-bad",
                lastActivityAt: now - (_tunables.STALE_THRESHOLD_MS + 1000),
            });
            const good = makeGameState({
                gameId: "good",
                roomname: "room-good",
                lastActivityAt: now - (_tunables.STALE_THRESHOLD_MS + 1000),
            });

            listActiveGames.mockReturnValue([
                ["bad", bad],
                ["good", good],
            ]);
            getGameState.mockImplementation((id) => (id === "bad" ? bad : good));
            Game.findById.mockImplementation((id) => {
                if (id === "bad") return Promise.reject(new Error("boom"));
                return Promise.resolve({
                    _id: "good",
                    roomname: "room-good",
                    players: [],
                });
            });

            const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

            const io = makeFakeIo();
            await sweepStaleGames(io);

            // Both still had their in-memory state deleted
            expect(deleteGameState).toHaveBeenCalledWith("bad");
            expect(deleteGameState).toHaveBeenCalledWith("good");

            errSpy.mockRestore();
        });
    });
});
