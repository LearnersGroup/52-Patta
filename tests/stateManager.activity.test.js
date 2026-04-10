/**
 * Unit tests for the activity-tracking additions in stateManager:
 *   - setGameState auto-stamps lastActivityAt when missing
 *   - markActivity bumps lastActivityAt on the in-memory state
 *   - listActiveGames yields [gameId, state] tuples
 *   - persistCheckpoint strips the recording blob from checkpoints
 */

jest.mock("../models/Game", () => ({
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
}));

describe("stateManager — activity tracking + checkpoint stripping", () => {
    let stateManager;
    let Game;

    beforeEach(() => {
        // Reset the module between tests so the in-memory Map starts fresh.
        // After resetModules, re-require so both `Game` and `stateManager`
        // reference the same post-reset mock instance.
        jest.resetModules();
        jest.clearAllMocks();
        Game = require("../models/Game");
        Game.findByIdAndUpdate.mockResolvedValue({});
        stateManager = require("../game_engine/stateManager");
    });

    describe("setGameState", () => {
        test("stamps lastActivityAt when missing", () => {
            const before = Date.now();
            const state = { phase: "bidding" };
            stateManager.setGameState("g1", state);

            expect(state.lastActivityAt).toBeGreaterThanOrEqual(before);
            expect(stateManager.getGameState("g1")).toBe(state);
        });

        test("does not clobber an existing lastActivityAt", () => {
            const prior = Date.now() - 100000;
            const state = { phase: "bidding", lastActivityAt: prior };
            stateManager.setGameState("g1", state);

            expect(state.lastActivityAt).toBe(prior);
        });
    });

    describe("markActivity", () => {
        test("bumps lastActivityAt on an active game", async () => {
            const prior = Date.now() - 100000;
            stateManager.setGameState("g1", { lastActivityAt: prior });

            // Give the clock a tick
            await new Promise((r) => setTimeout(r, 5));
            stateManager.markActivity("g1");

            const state = stateManager.getGameState("g1");
            expect(state.lastActivityAt).toBeGreaterThan(prior);
        });

        test("is a no-op for unknown gameIds", () => {
            expect(() => stateManager.markActivity("nope")).not.toThrow();
        });
    });

    describe("listActiveGames", () => {
        test("yields [gameId, state] tuples for every active game", () => {
            stateManager.setGameState("a", { phase: "playing" });
            stateManager.setGameState("b", { phase: "bidding" });

            const entries = stateManager.listActiveGames();
            const ids = entries.map(([id]) => id).sort();
            expect(ids).toEqual(["a", "b"]);
            for (const [, state] of entries) {
                expect(state).toHaveProperty("phase");
            }
        });

        test("returns an empty array when no active games exist", () => {
            expect(stateManager.listActiveGames()).toEqual([]);
        });
    });

    describe("persistCheckpoint — recording blob stripping", () => {
        test("omits gameState.recording from the DB write", async () => {
            const huge = { hugeBlob: "x".repeat(50000), tricks: [] };
            stateManager.setGameState("g1", {
                phase: "playing",
                hands: { p1: [] },
                recording: huge,
            });

            await stateManager.persistCheckpoint("g1");

            expect(Game.findByIdAndUpdate).toHaveBeenCalledTimes(1);
            const [id, update] = Game.findByIdAndUpdate.mock.calls[0];
            expect(id).toBe("g1");
            expect(update.state).toBe("playing");
            // Recording must NOT be in the checkpoint payload
            expect(update.gameState).toBeDefined();
            expect(update.gameState.recording).toBeUndefined();
            // But everything else should still be there
            expect(update.gameState.hands).toEqual({ p1: [] });
            expect(update.gameState.phase).toBe("playing");
        });

        test("does not throw when there is no game state to checkpoint", async () => {
            await expect(
                stateManager.persistCheckpoint("ghost")
            ).resolves.toBeUndefined();
            expect(Game.findByIdAndUpdate).not.toHaveBeenCalled();
        });
    });
});
