import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    phase: null, // null | "bidding" | "powerhouse" | "playing" | "scoring" | "finished"
    configKey: null,
    seatOrder: [],
    playerNames: {},
    removedTwos: [],
    myHand: [],
    validPlays: [],
    bidding: null,
    leader: null,
    powerHouseSuit: null,
    partnerCards: [],
    partnerCardCount: null,
    teams: { bid: [], oppose: [] },
    revealedPartners: [],
    currentRound: 0,
    currentTrick: null,
    tricks: [],
    roundLeader: null,
    handSizes: {},
    scores: {},
    scoringResult: null,
    nextRoundReady: { readyPlayers: [], totalPlayers: 0 },
    error: null,
};

const gameSlice = createSlice({
    name: "game",
    initialState,
    reducers: {
        updateGameState: (state, action) => {
            const data = action.payload;
            state.phase = data.phase;
            state.configKey = data.configKey;
            state.seatOrder = data.seatOrder;
            state.playerNames = data.playerNames || {};
            state.removedTwos = data.removedTwos;
            state.myHand = data.myHand;
            state.validPlays = data.validPlays;
            state.bidding = data.bidding;
            state.leader = data.leader;
            state.powerHouseSuit = data.powerHouseSuit;
            state.partnerCards = data.partnerCards;
            state.partnerCardCount = data.partnerCardCount || null;
            state.teams = data.teams;
            state.revealedPartners = data.revealedPartners;
            state.currentRound = data.currentRound;
            state.currentTrick = data.currentTrick;
            state.tricks = data.tricks;
            state.roundLeader = data.roundLeader;
            state.handSizes = data.handSizes;
            state.scores = data.scores;
            state.scoringResult = data.scoringResult || null;
            // Reset next-round readiness when a new game state arrives
            if (data.phase !== "finished") {
                state.nextRoundReady = { readyPlayers: [], totalPlayers: 0 };
            }
            state.error = null;
        },
        updateNextRoundReady: (state, action) => {
            state.nextRoundReady = action.payload;
        },
        setGameError: (state, action) => {
            state.error = action.payload;
        },
        clearGameError: (state) => {
            state.error = null;
        },
        resetGame: () => initialState,
    },
});

export const { updateGameState, updateNextRoundReady, setGameError, clearGameError, resetGame } =
    gameSlice.actions;

export default gameSlice.reducer;
