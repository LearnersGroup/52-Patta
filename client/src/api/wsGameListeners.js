import { socket } from "../socket";
import store from "../redux/store";
import {
    updateGameState,
    updateShuffleQueue,
    setGameError,
    resetGame,
    updateNextRoundReady,
} from "../redux/slices/game";

/**
 * Register all game-related socket listeners.
 * Call once (e.g. in GamePage useEffect). Returns a cleanup function.
 */
export function registerGameListeners() {
    const onGameStateUpdate = (data) => {
        store.dispatch(updateGameState(data));
    };

    const onGameError = (error) => {
        store.dispatch(setGameError(error));
    };

    const onGameOver = (data) => {
        store.dispatch(updateGameState(data));
    };

    const onNextRoundReadyUpdate = (data) => {
        store.dispatch(updateNextRoundReady(data));
    };

    const onGameQuit = () => {
        store.dispatch(resetGame());
    };

    // Shuffling & dealing listeners
    const onShuffleStatus = (data) => {
        // data: { type, dealerName, shuffleQueue, queueLength }
        if (data.shuffleQueue) {
            store.dispatch(updateShuffleQueue(data.shuffleQueue));
        }
    };

    const onSeriesComplete = () => {
        // Series over — reset game state and return to lobby
        store.dispatch(resetGame());
    };

    // Mendikot: real-time team update during lobby.
    // The web lobby already refreshes via fetch-users-in-room → getRoomDetails().
    // Do NOT dispatch updateGameState here — the partial payload (only team_a/b_players)
    // would overwrite every Redux field with undefined and crash the GameBoard.
    const onMendikotTeamUpdate = () => {}; // handled by fetch-users-in-room

    // Mendikot: trump revealed mid-game.
    // A full game-state-update is broadcast immediately after this event.
    // Do NOT dispatch updateGameState here — the partial payload would corrupt Redux state.
    const onMendikotTrumpRevealed = () => {}; // trump_suit arrives via game-state-update

    socket.on("game-state-update", onGameStateUpdate);
    socket.on("game-error", onGameError);
    socket.on("game-over", onGameOver);
    socket.on("next-round-ready-update", onNextRoundReadyUpdate);
    socket.on("game-quit", onGameQuit);
    socket.on("game-shuffle-status", onShuffleStatus);
    socket.on("game-series-complete", onSeriesComplete);
    socket.on("mendikot-team-update", onMendikotTeamUpdate);
    socket.on("mendikot-trump-revealed", onMendikotTrumpRevealed);

    return () => {
        socket.off("game-state-update", onGameStateUpdate);
        socket.off("game-error", onGameError);
        socket.off("game-over", onGameOver);
        socket.off("next-round-ready-update", onNextRoundReadyUpdate);
        socket.off("game-quit", onGameQuit);
        socket.off("game-shuffle-status", onShuffleStatus);
        socket.off("game-series-complete", onSeriesComplete);
        socket.off("mendikot-team-update", onMendikotTeamUpdate);
        socket.off("mendikot-trump-revealed", onMendikotTrumpRevealed);
    };
}

/**
 * Clear game state from Redux (e.g. when leaving a room).
 */
export function clearGameState() {
    store.dispatch(resetGame());
}
