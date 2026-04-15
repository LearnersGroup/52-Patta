import { createSlice } from "@reduxjs/toolkit";

const AVATAR_CACHE_PREFIX = "avatars:";

const readCachedAvatars = (gameId) => {
    if (!gameId || typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(`${AVATAR_CACHE_PREFIX}${gameId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
};

const initialState = {
    gameId: null,
    game_type: null,
    phase: null, // null | "trump-announce" | "shuffling" | "dealing" | "bidding" | "powerhouse" | "playing" | "scoring" | "finished" | "series-finished"
    configKey: null,
    config: null,
    seatOrder: [],
    playerNames: {},
    playerAvatars: {},
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
    dealingConfig: null,
    handSorted: true, // toggle for sort-by-suit vs natural order

    // Game series tracking
    currentGameNumber: 1,
    totalGames: 1,
    finalRankings: null,

    // Judgement-specific
    trumpCard: null,
    trumpSuit: null,
    trumpMode: "random",
    scoreboardTimeMs: 5000,
    bidTimeMs: null,
    cardRevealTimeMs: 10000,
    judgementBids: {},
    judgementBidOrder: [],
    judgementCurrentBidderIndex: null,
    tricksWon: {},
    currentCardsPerRound: 0,
    seriesRoundIndex: 0,
    totalRoundsInSeries: 0,
    roundResults: [],

    // Client-side per-game score history (accumulated from scoringResult events)
    // Each entry: { gameNumber, playerDeltas, bidTeamSuccess }
    gameHistory: [],

    // Mendikot-specific
    // phase can also be "band-hukum-pick"
    closed_trump_holder_id: null,
    closed_trump_revealed: false,
    closed_trump_placeholder: null,
    closed_trump_card: null,
    trump_suit: null,
    trump_revealed_at_trick: null,
    trump_asker_id: null,
    pending_trump_reveal_decision: false,
    tens_by_team: { A: 0, B: 0 },
    tens_cards_by_team: { A: [], B: [] },
    tricks_by_team: { A: 0, B: 0 },
    currentRoundNumber: 1,
    totalRounds: 1,
    round_results: [],
    session_totals: { A: {}, B: {} },
};

const gameSlice = createSlice({
    name: "game",
    initialState,
    reducers: {
        updateGameState: (state, action) => {
            const data = action.payload;
            const previousGameId = state.gameId;
            const normalizedClosedTrumpCard =
                data.closed_trump_card ??
                data.closedTrumpCard ??
                data.revealed_trump_card ??
                data.revealedTrumpCard;
            state.gameId = data.gameId || state.gameId;
            state.game_type = data.game_type || state.game_type || "kaliteri";
            state.phase = data.phase;
            state.configKey = data.configKey;
            state.config = data.config || null;
            state.seatOrder = data.seatOrder;
            state.playerNames = data.playerNames || {};

            // Avatars arrive via the separate "game-avatars" socket event.
            // Keep existing avatars across game-state updates.
            if (previousGameId && state.gameId && previousGameId !== state.gameId) {
                state.playerAvatars = {};
            }

            if (!Object.keys(state.playerAvatars || {}).length && state.gameId) {
                const cached = readCachedAvatars(state.gameId);
                if (cached) {
                    state.playerAvatars = cached;
                }
            }

            if (!state.playerAvatars) {
                state.playerAvatars = {};
            }

            state.removedTwos = data.removedTwos;
            state.myHand = data.myHand;
            state.validPlays = data.validPlays;
            state.bidding = data.bidding;
            state.leader = data.leader;
            state.powerHouseSuit = data.powerHouseSuit;
            state.partnerCards = data.partnerCards || [];
            state.partnerCardCount = data.partnerCardCount || null;
            state.teams = data.teams || { bid: [], oppose: [] };
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

            // Judgement-specific payload
            state.trumpCard = data.trumpCard || null;
            state.trumpSuit = data.trumpSuit || null;
            state.trumpMode = data.trumpMode || "random";
            state.scoreboardTimeMs = data.scoreboardTimeMs || 5000;
            state.bidTimeMs = data.bidTimeMs ?? null;
            if (action.payload.cardRevealTimeMs !== undefined) state.cardRevealTimeMs = action.payload.cardRevealTimeMs;
            state.judgementBids = data.bidding?.bids || {};
            state.judgementBidOrder = data.bidding?.bidOrder || [];
            state.judgementCurrentBidderIndex =
                data.bidding?.currentBidderIndex ?? null;
            state.tricksWon = data.tricksWon || {};
            state.currentCardsPerRound = data.currentCardsPerRound || 0;
            state.seriesRoundIndex = data.seriesRoundIndex || 0;
            state.totalRoundsInSeries = data.totalRoundsInSeries || 0;
            state.roundResults = data.roundResults || [];
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

            // Mendikot-specific fields
            if (data.closed_trump_holder_id !== undefined) state.closed_trump_holder_id = data.closed_trump_holder_id;
            if (data.closed_trump_revealed !== undefined) state.closed_trump_revealed = data.closed_trump_revealed;
            if (data.closed_trump_placeholder !== undefined) state.closed_trump_placeholder = data.closed_trump_placeholder;
            if (normalizedClosedTrumpCard !== undefined) state.closed_trump_card = normalizedClosedTrumpCard;
            if (data.trump_suit !== undefined) state.trump_suit = data.trump_suit;
            if (data.trump_revealed_at_trick !== undefined) state.trump_revealed_at_trick = data.trump_revealed_at_trick;
            if (data.trump_asker_id !== undefined) state.trump_asker_id = data.trump_asker_id;
            if (data.pending_trump_reveal_decision !== undefined) state.pending_trump_reveal_decision = data.pending_trump_reveal_decision;
            if (data.tens_by_team !== undefined) state.tens_by_team = data.tens_by_team;
            if (data.tens_cards_by_team !== undefined) state.tens_cards_by_team = data.tens_cards_by_team;
            if (data.tricks_by_team !== undefined) state.tricks_by_team = data.tricks_by_team;
            if (data.currentRoundNumber !== undefined) state.currentRoundNumber = data.currentRoundNumber;
            if (data.totalRounds !== undefined) state.totalRounds = data.totalRounds;
            if (data.round_results !== undefined) state.round_results = data.round_results;
            if (data.session_totals !== undefined) state.session_totals = data.session_totals;

            state.error = null;
        },
        updateShuffleQueue: (state, action) => {
            state.shuffleQueue = action.payload;
        },
        setPlayerAvatars: (state, action) => {
            state.playerAvatars = action.payload || {};
        },
        toggleHandSort: (state) => {
            state.handSorted = !state.handSorted;
        },
        updateNextRoundReady: (state, action) => {
            state.nextRoundReady = action.payload;
        },
        applyMendikotTrumpRevealed: (state, action) => {
            const data = action.payload || {};
            const revealCard =
                data.card ??
                data.closed_trump_card ??
                data.closedTrumpCard ??
                data.revealed_trump_card ??
                data.revealedTrumpCard;
            const revealSuit =
                data.suit ??
                data.trump_suit ??
                data.trumpSuit;
            const revealBy =
                data.by ??
                data.trump_asker_id ??
                data.trumpAskerId;
            state.closed_trump_revealed = true;
            if (revealCard !== undefined) state.closed_trump_card = revealCard;
            if (revealSuit !== undefined) state.trump_suit = revealSuit;
            if (revealBy !== undefined) state.trump_asker_id = revealBy;
            state.pending_trump_reveal_decision = false;
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
    setPlayerAvatars,
    toggleHandSort,
    updateNextRoundReady,
    applyMendikotTrumpRevealed,
    setGameError,
    clearGameError,
    resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;
