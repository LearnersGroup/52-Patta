const { computeNextDealer } = require("../game_engine/mendikot/dealerRotation");

function buildSeatAndTeams(playerCount) {
    const pairCount = playerCount / 2;
    const seatOrder = [];
    const teams = { A: [], B: [] };

    for (let i = 0; i < pairCount; i += 1) {
        const a = `A${i}`;
        const b = `B${i}`;
        teams.A.push(a);
        teams.B.push(b);
        seatOrder.push(a, b);
    }

    return { seatOrder, teams };
}

describe("mendikot dealer rotation", () => {
    test.each([4, 6, 8, 10, 12])("rotation rules for %ip", (playerCount) => {
        const { seatOrder, teams } = buildSeatAndTeams(playerCount);

        expect(computeNextDealer(seatOrder, "A0", teams, { winningTeam: "A" })).toBe("B0");
        expect(computeNextDealer(seatOrder, "A0", teams, { winningTeam: "B" })).toBe("A1");
    });

    test("4p explicit case: dealer B1 and B wins", () => {
        const { seatOrder, teams } = buildSeatAndTeams(4);
        expect(computeNextDealer(seatOrder, "B1", teams, { winningTeam: "B" })).toBe("A0");
    });

    test("6p explicit case: dealer B0 and A wins", () => {
        const { seatOrder, teams } = buildSeatAndTeams(6);
        expect(computeNextDealer(seatOrder, "B0", teams, { winningTeam: "A" })).toBe("B1");
    });

    test("unknown dealer falls back to first seat", () => {
        const { seatOrder, teams } = buildSeatAndTeams(4);
        expect(computeNextDealer(seatOrder, "UNKNOWN", teams, { winningTeam: "A" })).toBe(seatOrder[0]);
    });
});
