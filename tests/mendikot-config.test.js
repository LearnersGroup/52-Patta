const { MATRIX, computeMendikotConfig } = require("../game_engine/mendikot/config");

describe("mendikot config", () => {
    test("all supported player/deck combos compute valid config", () => {
        for (const [playersRaw, deckRow] of Object.entries(MATRIX)) {
            const players = Number(playersRaw);
            for (const decksRaw of Object.keys(deckRow)) {
                const decks = Number(decksRaw);
                const config = computeMendikotConfig(players, decks);

                expect(config).toBeTruthy();
                expect(config.cardsPerPlayer * players + config.removeTwos).toBe(52 * decks);
                expect(config.playDirection).toBe("clockwise");
                expect(config.rounds_count).toBe(5);
                expect(config.trump_mode).toBe("band");
            }
        }
    });

    test("invalid combos throw", () => {
        expect(() => computeMendikotConfig(5, 1)).toThrow();
        expect(() => computeMendikotConfig(4, 3)).toThrow();
        expect(() => computeMendikotConfig(4, 1, "invalid-mode")).toThrow();
        expect(() => computeMendikotConfig(4, 1, "band", true, 21)).toThrow();
        expect(() => computeMendikotConfig(4, 1, "band", true, 0)).toThrow();
    });
});
