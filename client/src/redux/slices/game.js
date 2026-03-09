import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    phase: null, // null | "shuffling" | "dealing" | "bidding" | "powerhouse" | "playing" | "scoring" | "finished" | "series-finished"
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

    // Dealer & shuffling
    dealer: null,
    dealerIndex: 0,
    shuffleQueue: [],
    cutCard: null,
    dealingConfig: null,
    handSorted: true, // toggle for sort-by-suit vs natural order

    // Game series tracking
    currentGameNumber: 1,
    totalGames: 1,
    finalRankings: null,

    // Client-side per-game score history (accumulated from scoringResult events)
    // Each entry: { gameNumber, playerDeltas, bidTeamSuccess }
    gameHistory: [],
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
            state.partnerCards = data.partnerCards || [];
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

            // Dealer & shuffling fields
            state.dealer = data.dealer || null;
            state.dealerIndex = data.dealerIndex ?? 0;
            state.shuffleQueue = data.shuffleQueue || [];
            state.dealingConfig = data.dealingConfig || null;

            // Game series tracking
            state.currentGameNumber = data.currentGameNumber || 1;
            state.totalGames = data.totalGames || 1;
            state.finalRankings = data.finalRankings || null;

            // Accumulate per-game score history when a game finishes
            if (data.scoringResult && data.phase === "finished") {
                const gameNum = data.currentGameNumber || 1;
                const alreadyRecorded = state.gameHistory.some(
                    (g) => g.gameNumber === gameNum
                );
                if (!alreadyRecorded) {
                    state.gameHistory.push({
                        gameNumber: gameNum,
                        playerDeltas: data.scoringResult.playerDeltas || {},
                        bidTeamSuccess: data.scoringResult.bidTeamSuccess,
                    });
                }
            }

            // Reset history when a fresh series starts (game 1, pre-deal phases)
            if (
                (data.currentGameNumber === 1 || !data.currentGameNumber) &&
                ["shuffling", "dealing"].includes(data.phase)
            ) {
                state.gameHistory = [];
            }

            // Reset next-round readiness when a new game state arrives
            if (data.phase !== "finished") {
                state.nextRoundReady = { readyPlayers: [], totalPlayers: 0 };
            }
            state.error = null;
        },
        updateShuffleQueue: (state, action) => {
            state.shuffleQueue = action.payload;
        },
        setCutCard: (state, action) => {
            state.cutCard = action.payload;
        },
        toggleHandSort: (state) => {
            state.handSorted = !state.handSorted;
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

export const {
    updateGameState,
    updateShuffleQueue,
    setCutCard,
    toggleHandSort,
    updateNextRoundReady,
    setGameError,
    clearGameError,
    resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;
