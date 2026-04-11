const { classifyRoundResult, firstToNTricksWinner } = require("../game_engine/mendikot/scoring");

function makeState({ decks, tensA, tensB, tricksA, tricksB, trickWinners, firstToN }) {
    const teams = { A: ["A0", "A1"], B: ["B0", "B1"] };
    const tricks = (trickWinners || []).map((winner) => ({ winner }));
    return {
        config: { decks },
        teams,
        tens_by_team: { A: tensA, B: tensB },
        tricks_by_team: { A: tricksA, B: tricksB },
        tricks,
        first_to_n_tricks: firstToN || null,
    };
}

describe("mendikot scoring classification", () => {
    test("1-deck: 52-card mendikot", () => {
        const state = makeState({
            decks: 1,
            tensA: 4,
            tensB: 0,
            tricksA: 13,
            tricksB: 0,
            trickWinners: Array(13).fill("A0"),
        });
        expect(classifyRoundResult(state)).toEqual({ type: "52-card mendikot", winningTeam: "A" });
    });

    test("1-deck: mendikot", () => {
        const state = makeState({
            decks: 1,
            tensA: 4,
            tensB: 0,
            tricksA: 7,
            tricksB: 6,
            trickWinners: [...Array(7).fill("A0"), ...Array(6).fill("B0")],
        });
        expect(classifyRoundResult(state)).toEqual({ type: "mendikot", winningTeam: "A" });
    });

    test("1-deck: win-by-mendi", () => {
        const state = makeState({
            decks: 1,
            tensA: 3,
            tensB: 1,
            tricksA: 6,
            tricksB: 7,
            trickWinners: [...Array(6).fill("A0"), ...Array(7).fill("B0")],
        });
        expect(classifyRoundResult(state)).toEqual({ type: "win-by-mendi", winningTeam: "A" });
    });

    test("1-deck: split tens, win-by-tricks", () => {
        const state = makeState({
            decks: 1,
            tensA: 2,
            tensB: 2,
            tricksA: 8,
            tricksB: 5,
            trickWinners: [...Array(8).fill("A0"), ...Array(5).fill("B0")],
        });
        expect(classifyRoundResult(state)).toEqual({ type: "win-by-tricks", winningTeam: "A" });
    });

    test("1-deck: split tens + tied tricks uses first_to_n_tricks", () => {
        const state = makeState({
            decks: 1,
            tensA: 2,
            tensB: 2,
            tricksA: 6,
            tricksB: 6,
            trickWinners: [...Array(6).fill("A0"), ...Array(6).fill("B0")],
            firstToN: "B",
        });
        expect(classifyRoundResult(state)).toEqual({ type: "win-by-tricks", winningTeam: "B" });
    });

    test("2-deck: 52-card mendikot", () => {
        const state = makeState({
            decks: 2,
            tensA: 8,
            tensB: 0,
            tricksA: 26,
            tricksB: 0,
            trickWinners: Array(26).fill("A0"),
        });
        expect(classifyRoundResult(state)).toEqual({ type: "52-card mendikot", winningTeam: "A" });
    });

    test("2-deck: mendikot", () => {
        const state = makeState({
            decks: 2,
            tensA: 8,
            tensB: 0,
            tricksA: 14,
            tricksB: 12,
            trickWinners: [...Array(14).fill("A0"), ...Array(12).fill("B0")],
        });
        expect(classifyRoundResult(state)).toEqual({ type: "mendikot", winningTeam: "A" });
    });

    test("2-deck: win-by-mendi", () => {
        const state = makeState({
            decks: 2,
            tensA: 6,
            tensB: 2,
            tricksA: 10,
            tricksB: 16,
            trickWinners: [...Array(10).fill("A0"), ...Array(16).fill("B0")],
        });
        expect(classifyRoundResult(state)).toEqual({ type: "win-by-mendi", winningTeam: "A" });
    });

    test("2-deck: split tens + tied tricks uses first_to_n_tricks", () => {
        const state = makeState({
            decks: 2,
            tensA: 4,
            tensB: 4,
            tricksA: 13,
            tricksB: 13,
            trickWinners: [...Array(13).fill("A0"), ...Array(13).fill("B0")],
            firstToN: "B",
        });
        expect(classifyRoundResult(state)).toEqual({ type: "win-by-tricks", winningTeam: "B" });
    });
});

describe("firstToNTricksWinner", () => {
    test("returns first team to reach N", () => {
        const tricks = [{ winner: "A0" }, { winner: "A1" }, { winner: "B0" }, { winner: "A0" }];
        const teams = { A: ["A0", "A1"], B: ["B0", "B1"] };
        expect(firstToNTricksWinner(tricks, teams, 2)).toBe("A");
    });

    test("returns null when N not reached", () => {
        const tricks = [{ winner: "A0" }, { winner: "B0" }];
        const teams = { A: ["A0", "A1"], B: ["B0", "B1"] };
        expect(firstToNTricksWinner(tricks, teams, 5)).toBeNull();
    });
});
