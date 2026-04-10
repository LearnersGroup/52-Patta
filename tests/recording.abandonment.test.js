/**
 * Unit tests for the abandonment-related behavior in recording.persistRecording.
 *
 * Verifies:
 *   - Abandoned deals with no meaningful progress are skipped (no DB write).
 *   - Abandoned deals with at least some bids or tricks do get persisted.
 *   - The abandoned record gets status, abandonReason, abandonedAtPhase,
 *     endedAt, and durationMs populated correctly.
 *   - Completed deals still use status="completed" by default.
 */

jest.mock("../models/GameRecord", () => ({
    create: jest.fn(),
}));

const GameRecord = require("../models/GameRecord");
const { persistRecording } = require("../game_engine/recording");

function baseRecording(overrides = {}) {
    return {
        gameType: "kaliteri",
        startedAt: Date.now() - 60 * 1000, // 1 min ago
        currentGameNumber: 1,
        totalGames: 4,
        config: { playerCount: 6 },
        seatOrder: ["p1", "p2"],
        playerNames: { p1: "A", p2: "B" },
        dealer: "p1",
        dealerIndex: 0,
        removedTwos: [],
        initialHands: {},
        handMetrics: {},
        totalPointsInDeck: 250,
        bidding: { bidEvents: [], judgementBids: {} },
        powerhouse: null,
        tricks: [],
        result: null,
        endedAt: null,
        durationMs: null,
        ...overrides,
    };
}

function makeState(recording, extras = {}) {
    return {
        gameId: "game-id-1",
        roomname: "room-1",
        phase: "playing",
        recording,
        ...extras,
    };
}

describe("persistRecording — abandonment behavior", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        GameRecord.create.mockResolvedValue({ _id: "doc-1" });
    });

    test("skips abandoned records that have no bids and no tricks", async () => {
        const state = makeState(baseRecording()); // empty bidding + tricks

        const id = await persistRecording(state, {
            status: "abandoned",
            abandonReason: "all-disconnected",
        });

        expect(id).toBeNull();
        expect(GameRecord.create).not.toHaveBeenCalled();
    });

    test("persists abandoned records that have at least one bid event", async () => {
        const state = makeState(
            baseRecording({
                bidding: {
                    bidEvents: [{ type: "bid", playerId: "p1", amount: 155 }],
                    judgementBids: {},
                },
            })
        );

        const id = await persistRecording(state, {
            status: "abandoned",
            abandonReason: "all-disconnected",
        });

        expect(id).toBe("doc-1");
        expect(GameRecord.create).toHaveBeenCalledTimes(1);
        const payload = GameRecord.create.mock.calls[0][0];
        expect(payload.status).toBe("abandoned");
        expect(payload.abandonReason).toBe("all-disconnected");
        expect(payload.abandonedAtPhase).toBe("playing");
        expect(payload.endedAt).toBeInstanceOf(Date);
        expect(typeof payload.durationMs).toBe("number");
        expect(payload.durationMs).toBeGreaterThan(0);
    });

    test("persists abandoned records that have at least one trick played", async () => {
        const state = makeState(
            baseRecording({
                tricks: [{ trickNumber: 0, plays: [], completed: true }],
            })
        );

        const id = await persistRecording(state, {
            status: "abandoned",
            abandonReason: "stale-eviction",
        });

        expect(id).toBe("doc-1");
        const payload = GameRecord.create.mock.calls[0][0];
        expect(payload.status).toBe("abandoned");
        expect(payload.abandonReason).toBe("stale-eviction");
    });

    test("persists abandoned Judgement records that have at least one bid in judgementBids", async () => {
        const state = makeState(
            baseRecording({
                gameType: "judgement",
                bidding: { bidEvents: [], judgementBids: { p1: 3 } },
            })
        );

        const id = await persistRecording(state, {
            status: "abandoned",
            abandonReason: "all-disconnected",
        });

        expect(id).toBe("doc-1");
        expect(GameRecord.create.mock.calls[0][0].status).toBe("abandoned");
    });

    test("completed records (no opts) default to status=completed", async () => {
        const state = makeState(
            baseRecording({
                bidding: {
                    bidEvents: [{ type: "bid", playerId: "p1", amount: 155 }],
                    judgementBids: {},
                },
                endedAt: Date.now(),
                durationMs: 60000,
            })
        );

        await persistRecording(state);

        expect(GameRecord.create).toHaveBeenCalledTimes(1);
        const payload = GameRecord.create.mock.calls[0][0];
        expect(payload.status).toBe("completed");
        expect(payload.abandonReason).toBeNull();
        expect(payload.abandonedAtPhase).toBeNull();
    });

    test("returns null and does not throw when gameState has no recording", async () => {
        const id = await persistRecording({ gameId: "g", roomname: "r" });
        expect(id).toBeNull();
        expect(GameRecord.create).not.toHaveBeenCalled();
    });

    test("swallows DB errors and returns null (recording is best-effort)", async () => {
        GameRecord.create.mockRejectedValueOnce(new Error("mongo down"));
        const state = makeState(
            baseRecording({
                bidding: { bidEvents: [{ type: "bid" }], judgementBids: {} },
            })
        );

        const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const id = await persistRecording(state, { status: "abandoned" });
        expect(id).toBeNull();
        errSpy.mockRestore();
    });
});
