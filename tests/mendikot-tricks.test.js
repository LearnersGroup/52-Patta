const { initTrick, playCard, getValidPlays } = require("../game_engine/mendikot/tricks");

function c(suit, rank, deckIndex = 0) {
    return { suit, rank, deckIndex };
}

function baseState(overrides = {}) {
    return {
        phase: "playing",
        seatOrder: ["A0", "B0", "A1", "B1"],
        teams: { A: ["A0", "A1"], B: ["B0", "B1"] },
        config: { trump_mode: "band", rounds: 1 },
        hands: {
            A0: [c("H", "5")],
            B0: [c("H", "7")],
            A1: [c("H", "8")],
            B1: [c("H", "9")],
        },
        currentTrick: initTrick("A0", ["A0", "B0", "A1", "B1"]),
        currentRound: 0,
        tricks: [],
        roundLeader: "A0",
        tricks_by_team: { A: 0, B: 0 },
        tens_by_team: { A: 0, B: 0 },
        tens_cards_by_team: { A: [], B: [] },
        first_to_n_tricks: null,
        trump_suit: null,
        trump_asker_id: null,
        trump_activation: null,
        closed_trump_holder_id: "B0",
        closed_trump_card: null,
        closed_trump_revealed: false,
        ...overrides,
    };
}

describe("mendikot tricks", () => {
    test("initTrick sets leader turn index", () => {
        const trick = initTrick("A1", ["A0", "B0", "A1", "B1"]);
        expect(trick.turnIndex).toBe(2);
        expect(trick.plays).toEqual([]);
        expect(trick.ledSuit).toBeNull();
    });

    test("suit-following enforced", () => {
        const state = baseState({
            hands: {
                A0: [c("H", "5")],
                B0: [c("H", "7"), c("S", "2")],
                A1: [c("H", "8")],
                B1: [c("H", "9")],
            },
        });

        const r1 = playCard(state, "A0", c("H", "5"));
        expect(r1.error).toBeUndefined();

        const r2 = playCard(r1.state, "B0", c("S", "2"));
        expect(r2.error).toMatch(/Must follow the led suit/);
    });

    test("last-played duplicate wins", () => {
        let state = baseState({
            config: { trump_mode: "band", rounds: 1 },
            hands: {
                A0: [c("H", "9", 0)],
                B0: [c("H", "9", 1)],
                A1: [c("H", "3", 0)],
                B1: [c("H", "4", 0)],
            },
        });

        state = playCard(state, "A0", c("H", "9", 0)).state;
        state = playCard(state, "B0", c("H", "9", 1)).state;
        state = playCard(state, "A1", c("H", "3", 0)).state;
        const result = playCard(state, "B1", c("H", "4", 0));

        expect(result.error).toBeUndefined();
        expect(result.state.tricks[0].winner).toBe("B0");
    });

    test("cut hukum first void sets trump and trick resolves by highest trump", () => {
        let state = baseState({
            config: { trump_mode: "cut", rounds: 1 },
            hands: {
                A0: [c("H", "5")],
                B0: [c("S", "9")],
                A1: [c("H", "K")],
                B1: [c("S", "10")],
            },
        });

        state = playCard(state, "A0", c("H", "5")).state;
        state = playCard(state, "B0", c("S", "9")).state;
        expect(state.trump_suit).toBe("S");
        state = playCard(state, "A1", c("H", "K")).state;
        const result = playCard(state, "B1", c("S", "10"));

        expect(result.state.trump_suit).toBe("S");
        expect(result.state.tricks[0].winner).toBe("B1");
    });

    test("tens are collected by trick-winning team", () => {
        let state = baseState({
            config: { trump_mode: "band", rounds: 1 },
            hands: {
                A0: [c("H", "10")],
                B0: [c("H", "4")],
                A1: [c("H", "A")],
                B1: [c("H", "5")],
            },
        });

        state = playCard(state, "A0", c("H", "10")).state;
        state = playCard(state, "B0", c("H", "4")).state;
        state = playCard(state, "A1", c("H", "A")).state;
        const result = playCard(state, "B1", c("H", "5"));

        expect(result.state.tricks[0].winner).toBe("A1");
        expect(result.state.tens_by_team.A).toBe(1);
        expect(result.state.tens_cards_by_team.A).toEqual([c("H", "10")]);
    });

    test("asker must play trump when they have one", () => {
        const state = baseState({
            trump_suit: "S",
            trump_asker_id: "B0",
            currentTrick: {
                ledSuit: "H",
                plays: [{ playerId: "A0", card: c("H", "5"), order: 0, trickIndex: 0 }],
                turnIndex: 1,
            },
            hands: {
                A0: [],
                B0: [c("S", "9"), c("C", "2")],
                A1: [],
                B1: [],
            },
        });

        expect(getValidPlays(state, "B0")).toEqual([c("S", "9")]);
        const result = playCard(state, "B0", c("C", "2"));
        expect(result.error).toMatch(/must play S/);
    });

    test("asker with no trump can play any valid card when void", () => {
        const state = baseState({
            trump_suit: "S",
            trump_asker_id: "B0",
            currentTrick: {
                ledSuit: "H",
                plays: [{ playerId: "A0", card: c("H", "5"), order: 0, trickIndex: 0 }],
                turnIndex: 1,
            },
            hands: {
                A0: [],
                B0: [c("C", "2"), c("D", "3")],
                A1: [],
                B1: [],
            },
        });

        expect(getValidPlays(state, "B0")).toEqual([c("C", "2"), c("D", "3")]);
    });
});
