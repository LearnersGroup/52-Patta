import { socket } from "../socket";
import store from "../redux/store";
import {
    updateGameState,
    updateShuffleQueue,
    setCutCard,
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

    const onCutCard = (cutCard) => {
        // Only sent to the dealer — set cut card for reveal overlay
        store.dispatch(setCutCard(cutCard));
    };

    const onSeriesComplete = () => {
        // Series over — reset game state and return to lobby
        store.dispatch(resetGame());
    };

    socket.on("game-state-update", onGameStateUpdate);
    socket.on("game-error", onGameError);
    socket.on("game-over", onGameOver);
    socket.on("next-round-ready-update", onNextRoundReadyUpdate);
    socket.on("game-quit", onGameQuit);
    socket.on("game-shuffle-status", onShuffleStatus);
    socket.on("game-cut-card", onCutCard);
    socket.on("game-series-complete", onSeriesComplete);

    return () => {
        socket.off("game-state-update", onGameStateUpdate);
        socket.off("game-error", onGameError);
        socket.off("game-over", onGameOver);
        socket.off("next-round-ready-update", onNextRoundReadyUpdate);
        socket.off("game-quit", onGameQuit);
        socket.off("game-shuffle-status", onShuffleStatus);
        socket.off("game-cut-card", onCutCard);
        socket.off("game-series-complete", onSeriesComplete);
    };
}

/**
 * Clear game state from Redux (e.g. when leaving a room).
 */
export function clearGameState() {
    store.dispatch(resetGame());
}
