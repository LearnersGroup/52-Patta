const { getValidPlays } = require("../../../game_engine/tricks");

// Ensure all strategies are registered
require("../../../game_engine/strategies");
const { getStrategy } = require("../../../game_engine/gameRegistry");

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
 * Delegates to the game-type-specific strategy.
 */
function buildPublicView(gameState) {
    const handSizes = {};
    for (const [pid, hand] of Object.entries(gameState.hands || {})) {
        handSizes[pid] = hand.length;
    }

    const strategy = getStrategy(gameState.game_type);
    return strategy.buildPublicView(gameState, handSizes);
}

module.exports = { broadcastGameState, buildPublicView };
