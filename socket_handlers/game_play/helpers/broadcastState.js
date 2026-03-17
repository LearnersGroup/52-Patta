const { getValidPlays } = require("../../../game_engine/tricks");
const { getPartnerCardCount } = require("../../../game_engine/powerhouse");

/**
 * Broadcast personalized game state to each player in the room.
 * Each player receives the public state + their own hand + valid plays.
 */
async function broadcastGameState(io, gameState) {
    const { roomname } = gameState;

    const publicView = buildPublicView(gameState);

    const sockets = await io.in(roomname).fetchSockets();
    for (const s of sockets) {
        const playerId = s.user?.id;
        if (!playerId) continue;

        const personalView = {
            ...publicView,
            myHand: gameState.hands[playerId] || [],
            validPlays: gameState.phase === "playing"
                ? getValidPlays(gameState, playerId)
                : [],
        };

        s.emit("game-state-update", personalView);
    }
}

/**
 * Build the public (shared) view of the game state.
 * Excludes private information like other players' hands.
 */
function buildPublicView(gameState) {
    const handSizes = {};
    for (const [pid, hand] of Object.entries(gameState.hands || {})) {
        handSizes[pid] = hand.length;
    }

    const isJudgement = gameState.game_type === "judgement";

    if (isJudgement) {
        return {
            gameId: gameState.gameId,
            game_type: "judgement",
            phase: gameState.phase,
            config: gameState.config,
            seatOrder: gameState.seatOrder,
            playerNames: gameState.playerNames || {},
            removedTwos: gameState.removedTwos || [],

            dealer: gameState.dealer || null,
            dealerIndex: gameState.dealerIndex ?? 0,
            shuffleQueue: gameState.shuffleQueue || [],
            dealingConfig: gameState.dealingConfig || null,

            bidding: gameState.bidding
                ? {
                      bids: gameState.bidding.bids || {},
                      bidOrder: gameState.bidding.bidOrder || [],
                      currentBidderIndex: gameState.bidding.currentBidderIndex ?? 0,
                      biddingComplete: !!gameState.bidding.biddingComplete,
                      totalBids: gameState.bidding.totalBids || 0,
                  }
                : null,

            leader: gameState.leader || null,
            currentRound: gameState.currentRound,
            currentTrick: gameState.currentTrick
                ? {
                      ...gameState.currentTrick,
                      currentTurn:
                          gameState.seatOrder[gameState.currentTrick.turnIndex] || null,
                  }
                : null,
            tricks: (gameState.tricks || []).map((t) => ({
                winner: t.winner,
                points: t.points,
                cards: t.cards,
            })),
            roundLeader: gameState.roundLeader,
            handSizes,

            scores: gameState.scores || {},
            scoringResult: gameState.scoringResult || null,

            trumpCard: gameState.trumpCard || null,
            trumpSuit: gameState.trumpSuit || null,
            tricksWon: gameState.tricksWon || {},
            currentCardsPerRound: gameState.currentCardsPerRound || 0,
            seriesRoundIndex: gameState.seriesRoundIndex || 0,
            totalRoundsInSeries: gameState.totalRoundsInSeries || gameState.config?.totalRounds || 0,
            roundResults: gameState.roundResults || [],
        };
    }

    return {
        gameId: gameState.gameId,
        game_type: gameState.game_type || "kaliteri",
        phase: gameState.phase,
        configKey: gameState.config?.key,
        seatOrder: gameState.seatOrder,
        playerNames: gameState.playerNames || {},
        removedTwos: gameState.removedTwos,

        // Dealer & shuffling info
        dealer: gameState.dealer || null,
        dealerIndex: gameState.dealerIndex ?? 0,
        shuffleQueue: gameState.shuffleQueue || [],
        dealingConfig: gameState.dealingConfig || null,

        // Game series tracking
        currentGameNumber: gameState.currentGameNumber || 1,
        totalGames: gameState.totalGames || 1,
        finalRankings: gameState.finalRankings || null,

        bidding: gameState.bidding
            ? {
                  currentBid:           gameState.bidding.currentBid,
                  currentBidder:        gameState.bidding.currentBidder,
                  passed:               gameState.bidding.passes || [],
                  startingBid:          gameState.bidding.startingBid,
                  biddingComplete:      gameState.bidding.biddingComplete,
                  increment:            gameState.config?.bidIncrement || 5,
                  maxBid:               gameState.config?.bidMax || 500,
                  biddingWindowMs:      gameState.config?.biddingWindowMs || 15000,
                  biddingWindowOpensAt: gameState.bidding.biddingWindowOpensAt,
                  biddingExpiresAt:     gameState.bidding.biddingExpiresAt,
              }
            : null,
        leader: gameState.leader,
        powerHouseSuit: gameState.powerHouseSuit,
        partnerCardCount: gameState.bidding ? getPartnerCardCount(gameState) : null,
        partnerCards: (gameState.partnerCards || []).map((pc) => ({
            card: pc.card,
            whichCopy: pc.whichCopy,
            revealed: pc.revealed,
            partnerId: pc.revealed ? pc.partnerId : null,
        })),
        teams: {
            bid: gameState.teams?.bid || [],
            oppose: gameState.teams?.oppose || [],
        },
        revealedPartners: gameState.revealedPartners || [],
        currentRound: gameState.currentRound,
        currentTrick: gameState.currentTrick
            ? {
                  ...gameState.currentTrick,
                  currentTurn:
                      gameState.seatOrder[gameState.currentTrick.turnIndex] || null,
              }
            : null,
        tricks: (gameState.tricks || []).map((t) => ({
            winner: t.winner,
            points: t.points,
            cards: t.cards,
        })),
        roundLeader: gameState.roundLeader,
        handSizes,
        scores: gameState.scores,
        scoringResult: gameState.scoringResult || null,
    };
}

module.exports = { broadcastGameState, buildPublicView };
