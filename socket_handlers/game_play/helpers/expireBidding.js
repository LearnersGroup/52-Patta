/**
 * Shared helper: expire bidding timer.
 * Called both from dealCardsHandler (initial window) and placeBid (refreshed window).
 * Resolves the current highest bid → powerhouse, or reshuffles if no bids were placed.
 */

const { createDeck, removeTwos } = require("../../../game_engine/deck");
const { resolveBiddingExpiry } = require("../../../game_engine/bidding");
const { getGameState, setGameState, persistCheckpoint } = require("../../../game_engine/stateManager");
const Game = require("../../../models/Game");
const { broadcastGameState } = require("./broadcastState");

async function expireBidding(io, gameId) {
    const gameState = getGameState(gameId);
    if (!gameState || gameState.phase !== "bidding") return;

    const { winner, redeal } = resolveBiddingExpiry(gameState.bidding);

    if (redeal) {
        // ── No bids: reshuffle same dealer ──────────────────────────────────
        io.to(gameState.roomname).emit(
            "room-message",
            "No bids placed! Reshuffling with same dealer..."
        );

        const { config, seatOrder } = gameState;
        const fullDeck = createDeck(config.decks);
        const { remainingDeck, removedTwos: removed } = removeTwos(fullDeck, config.removeTwos);

        const newState = {
            ...gameState,
            phase: "shuffling",
            unshuffledDeck: remainingDeck,
            removedTwos: removed,
            hands: {},
            handSizes: {},
            shuffleQueue: [],
            bidding: null,
            cutCard: null,
            leader: null,
            powerHouseSuit: null,
            partnerCards: [],
            teams: { bid: [], oppose: [...seatOrder] },
            revealedPartners: [],
            currentRound: 0,
            currentTrick: null,
            tricks: [],
            roundLeader: null,
        };

        setGameState(gameId, newState);
        await Game.findByIdAndUpdate(gameId, { state: "shuffling" });
        await broadcastGameState(io, newState);
        io.to(gameState.roomname).emit("game-phase-change", "shuffling");

        if (removed.length > 0) {
            io.to(gameState.roomname).emit("game-cards-removed", removed);
        }

    } else {
        // ── Highest bidder wins → powerhouse ────────────────────────────────
        const newState = {
            ...gameState,
            bidding: { ...gameState.bidding, biddingComplete: true },
            leader: winner,
            phase: "powerhouse",
            teams: {
                bid: [winner],
                oppose: gameState.seatOrder.filter((id) => id !== winner),
            },
        };

        setGameState(gameId, newState);
        await Game.findByIdAndUpdate(gameId, { state: "powerhouse" });
        await persistCheckpoint(gameId);
        io.to(gameState.roomname).emit("game-phase-change", "powerhouse");
        await broadcastGameState(io, newState);
    }
}

module.exports = { expireBidding };
