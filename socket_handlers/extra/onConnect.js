const User = require("../../models/User");
const { getGameState, rehydrateGame } = require("../../game_engine/stateManager");
const { buildPublicView } = require("../game_play/helpers/broadcastState");
const { getValidPlays } = require("../../game_engine/tricks");
const { cancelLobbyDisconnect } = require("./lobbyGracePeriod");
const { cancelPending: cancelAbandonment } = require("./abandonedGameCleanup");

/**
 * Fires every time a socket authenticates and connects.
 *
 * If the user has an active (non-lobby) game:
 *  1. Auto-join this socket to the Socket.IO room so it receives broadcasts.
 *  2. Push the personalised game state directly to this socket so the
 *     GamePage can render without needing the homepage rejoin flow.
 *  3. Emit "rejoin-available" for the client to show the rejoin banner
 *     (used when the user lands on the homepage instead of the game page).
 */
module.exports = (socket, io) => async () => {
    try {
        // Cancel any pending lobby disconnect grace-period timer
        const cancelledGameId = cancelLobbyDisconnect(socket.user.id);

        const user = await User.findById(socket.user.id)
            .populate("gameroom", ["roomname", "state", "code"]);

        // If the player was in a lobby and reconnected within the grace period,
        // rejoin them to the socket room and re-emit rejoin metadata so clients
        // landing on Home can auto-navigate back into the room.
        if (cancelledGameId && user?.gameroom && user.gameroom.state === "lobby") {
            const gameId = user.gameroom._id.toString();
            await socket.join(user.gameroom.roomname);
            socket.emit("rejoin-available", {
                roomId:    gameId,
                roomname:  user.gameroom.roomname,
                code:      user.gameroom.code,
                gamePhase: "lobby",
            });
            return; // Still in lobby — no game state to push
        }

        if (!user?.gameroom || !user.gameroom.state) {
            return; // No room at all
        }

        // If the player is in a lobby, redirect them straight back to it.
        if (user.gameroom.state === "lobby") {
            const gameId = user.gameroom._id.toString();
            await socket.join(user.gameroom.roomname);
            socket.emit("rejoin-available", {
                roomId:    gameId,
                roomname:  user.gameroom.roomname,
                code:      user.gameroom.code,
                gamePhase: "lobby",
            });
            return;
        }

        const roomname = user.gameroom.roomname;
        const gameId   = user.gameroom._id.toString();

        // A player is rejoining an active game — cancel any pending
        // abandonment timer so the room isn't wiped out from under them.
        cancelAbandonment(gameId);

        // ── Step 1: join socket to the game room ─────────────────────────────
        // Without this, io.to(roomname).emit(…) never reaches this socket.
        await socket.join(roomname);

        // ── Step 2: emit rejoin-available for the client UI ──────────────────
        socket.emit("rejoin-available", {
            roomId:    gameId,
            roomname,
            code:      user.gameroom.code,
            gamePhase: user.gameroom.state,
        });

        // ── Step 3: push game state directly so GamePage can bootstrap ───────
        // Try in-memory first, fall back to MongoDB checkpoint.
        let gameState = getGameState(gameId);
        if (!gameState) {
            gameState = await rehydrateGame(gameId);
        }
        if (!gameState) return; // No recoverable state — client stays on lobby

        const playerId  = socket.user.id;
        const publicView = buildPublicView(gameState);
        const personalView = {
            ...publicView,
            myHand:     gameState.hands[playerId] || [],
            validPlays: gameState.phase === "playing"
                ? getValidPlays(gameState, playerId)
                : [],
        };

        socket.emit("game-state-update", personalView);
        socket.emit("game-avatars", gameState.playerAvatars || {});

    } catch (err) {
        // Don't let a rejoin error break the connection
        console.error("Rejoin check error:", err.message);
    }
};
