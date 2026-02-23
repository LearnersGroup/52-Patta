import { socket } from "../socket";
import store from "../redux/store";
import {
    updateGameState,
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

    socket.on("game-state-update", onGameStateUpdate);
    socket.on("game-error", onGameError);
    socket.on("game-over", onGameOver);
    socket.on("next-round-ready-update", onNextRoundReadyUpdate);
    socket.on("game-quit", onGameQuit);

    return () => {
        socket.off("game-state-update", onGameStateUpdate);
        socket.off("game-error", onGameError);
        socket.off("game-over", onGameOver);
        socket.off("next-round-ready-update", onNextRoundReadyUpdate);
        socket.off("game-quit", onGameQuit);
    };
}

/**
 * Clear game state from Redux (e.g. when leaving a room).
 */
export function clearGameState() {
    store.dispatch(resetGame());
}
