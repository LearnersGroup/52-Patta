const { pickClosedTrump, revealTrump, autoRevealIfNeeded } = require("../game_engine/mendikot/bandHukum");
const { getValidPlays } = require("../game_engine/mendikot/tricks");
require("../game_engine/strategies/mendikot");
const { getStrategy } = require("../game_engine/gameRegistry");

function c(suit, rank, deckIndex = 0) {
    return { suit, rank, deckIndex };
}

function makeState(overrides = {}) {
    return {
        gameId: "g1",
        roomname: "room",
        game_type: "mendikot",
        phase: "band-hukum-pick",
        config: {
            decks: 1,
            rounds: 4,
            rounds_count: 5,
            trump_mode: "band",
            band_hukum_pick_phase: true,
        },
        seatOrder: ["A0", "B0", "A1", "B1"],
        playerNames: { A0: "A0", B0: "B0", A1: "A1", B1: "B1" },
        teams: { A: ["A0", "A1"], B: ["B0", "B1"] },
        hands: {
            A0: [c("H", "5"), c("S", "10")],
            B0: [c("C", "7")],
            A1: [c("D", "3")],
            B1: [c("H", "K")],
        },
        closed_trump_holder_id: "A0",
        closed_trump_card: null,
        closed_trump_revealed: false,
        closed_trump_placeholder: { holderId: "A0", holderName: "A0" },
        trump_suit: null,
        trump_revealed_at_trick: null,
        trump_activation: null,
        trump_asker_id: null,
        currentRound: 0,
        currentTrick: {
            ledSuit: "H",
            plays: [{ playerId: "B0", card: c("H", "6"), order: 0, trickIndex: 0 }],
            turnIndex: 2,
        },
        ...overrides,
    };
}

describe("mendikot band hukum", () => {
    test("picker can pick a specific card", () => {
        const state = makeState();
        const chosen = state.hands.A0[1];
        const before = [...state.hands.A0];

        const result = pickClosedTrump(state, "A0", chosen);
        expect(result.error).toBeUndefined();
        expect(state.closed_trump_card).toEqual(chosen);
        expect(state.closed_trump_revealed).toBe(false);
        expect(state.hands.A0).toHaveLength(before.length - 1);
    });

    test("picker can pass null and get random fallback", () => {
        const state = makeState();
        const before = [...state.hands.A0];

        const result = pickClosedTrump(state, "A0", null);
        expect(result.error).toBeUndefined();
        expect(before).toContainEqual(state.closed_trump_card);
        expect(state.hands.A0).toHaveLength(before.length - 1);
    });

    test("only picker can pick", () => {
        const state = makeState();
        const result = pickClosedTrump(state, "B0", state.hands.A0[0]);
        expect(result.error).toMatch(/Only the designated picker/);
    });

    test("picker can only pick once", () => {
        const state = makeState();
        pickClosedTrump(state, "A0", state.hands.A0[0]);
        const second = pickClosedTrump(state, "A0", state.hands.A0[0]);
        expect(second.error).toMatch(/already been picked/);
    });

    test("reveal rejected when asker is closed-trump holder", () => {
        const state = makeState({ phase: "playing" });
        pickClosedTrump(state, "A0", state.hands.A0[0]);
        state.currentTrick.turnIndex = state.seatOrder.indexOf("A0");
        const result = revealTrump(state, "A0");
        expect(result.error).toMatch(/cannot reveal trump/);
    });

    test("reveal sets trump suit and returns closed card to holder hand", () => {
        const state = makeState({ phase: "playing" });
        const picked = state.hands.A0[0];
        pickClosedTrump(state, "A0", picked);
        state.currentTrick = {
            ledSuit: "H",
            plays: [{ playerId: "B0", card: c("H", "6"), order: 0, trickIndex: 0 }],
            turnIndex: state.seatOrder.indexOf("A1"),
        };

        const result = revealTrump(state, "A1");
        expect(result.error).toBeUndefined();
        expect(state.hands.A0).toContainEqual(picked);
        expect(state.trump_suit).toBe(picked.suit);
        expect(state.trump_asker_id).toBe("A1");
    });

    test("reveal rejected when asker still has led suit", () => {
        const state = makeState({ phase: "playing" });
        pickClosedTrump(state, "A0", state.hands.A0[0]);
        state.currentTrick = {
            ledSuit: "D",
            plays: [{ playerId: "B0", card: c("D", "6"), order: 0, trickIndex: 0 }],
            turnIndex: state.seatOrder.indexOf("A1"),
        };
        state.hands.A1 = [c("D", "3")];

        const result = revealTrump(state, "A1");
        expect(result.error).toMatch(/Must be void in led suit/);
    });

    test("reveal rejected when no led suit", () => {
        const state = makeState({ phase: "playing" });
        pickClosedTrump(state, "A0", state.hands.A0[0]);
        state.currentTrick = {
            ledSuit: null,
            plays: [],
            turnIndex: state.seatOrder.indexOf("A1"),
        };

        const result = revealTrump(state, "A1");
        expect(result.error).toMatch(/after a suit has been led/);
    });

    test("auto-reveal fires on last trick for holder", () => {
        const state = makeState({ phase: "playing", currentRound: 3 });
        pickClosedTrump(state, "A0", state.hands.A0[0]);

        const fired = autoRevealIfNeeded(state, state.config.rounds - 1, "A0");
        expect(fired).toBe(true);
        expect(state.trump_suit).toBeTruthy();
    });

    test("auto-reveal does not fire on earlier trick", () => {
        const state = makeState({ phase: "playing", currentRound: 1 });
        pickClosedTrump(state, "A0", state.hands.A0[0]);

        const fired = autoRevealIfNeeded(state, 1, "A0");
        expect(fired).toBe(false);
        expect(state.trump_suit).toBeNull();
    });

    test("auto-reveal does not fire for non-holder on last trick", () => {
        const state = makeState({ phase: "playing", currentRound: 3 });
        pickClosedTrump(state, "A0", state.hands.A0[0]);

        const fired = autoRevealIfNeeded(state, state.config.rounds - 1, "B0");
        expect(fired).toBe(false);
        expect(state.trump_suit).toBeNull();
    });

    test("broadcast masks picker hand during blind pick phase", async () => {
        const state = makeState({ phase: "band-hukum-pick" });
        const strategy = getStrategy("mendikot");
        const handSizes = Object.fromEntries(
            Object.entries(state.hands).map(([pid, hand]) => [pid, hand.length])
        );
        const publicView = strategy.buildPublicView(state, handSizes);

        const buildPersonalView = (playerId) => {
            const rawHand = state.hands[playerId] || [];
            const isBlindPicker =
                state.game_type === "mendikot" &&
                state.phase === "band-hukum-pick" &&
                state.closed_trump_holder_id === playerId &&
                state.config?.band_hukum_pick_phase === true;
            const myHand = isBlindPicker
                ? rawHand.map(() => ({ faceDown: true }))
                : rawHand;
            return {
                ...publicView,
                myHand,
                validPlays: state.phase === "playing"
                    ? getValidPlays(state, playerId)
                    : [],
            };
        };

        const pickerPayload = buildPersonalView("A0");
        const otherPayload = buildPersonalView("B0");

        expect(pickerPayload.myHand).toEqual([{ faceDown: true }, { faceDown: true }]);
        expect(otherPayload.myHand).toEqual(state.hands.B0);
    });
});
