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

    return {
        gameId: gameState.gameId,
        phase: gameState.phase,
        configKey: gameState.config?.key,
        seatOrder: gameState.seatOrder,
        playerNames: gameState.playerNames || {},
        removedTwos: gameState.removedTwos,
        bidding: gameState.bidding
            ? {
                  ...gameState.bidding,
                  currentTurn:
                      gameState.seatOrder[gameState.bidding.turnIndex] || null,
                  passed: gameState.bidding.passes || [],
                  highestBidder: gameState.bidding.currentBidder,
                  increment: gameState.config?.bidIncrement || 5,
                  startingBid: gameState.bidding.startingBid,
                  maxBid: gameState.config?.bidMax || 500,
              }
            : null,
        leader: gameState.leader,
        powerHouseSuit: gameState.powerHouseSuit,
        partnerCardCount: gameState.bidding ? getPartnerCardCount(gameState) : null,
        partnerCards: gameState.partnerCards?.map((pc) => ({
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
