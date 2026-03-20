import { socket } from "./socket";
import store from "../redux/store";
import {
    updateGameState,
    updateShuffleQueue,
    setGameError,
    resetGame,
    updateNextRoundReady,
} from "../redux/slices/game";
import { notify } from "../redux/slices/alert";

const PHASE_LABELS = {
    "trump-announce": "Trump announced",
    shuffling: "Shuffling",
    dealing: "Dealing cards",
    bidding: "Bidding started",
    powerhouse: "Powerhouse selection",
    playing: "Playing phase",
    scoring: "Scoring",
    finished: "Round finished",
    "series-finished": "Series finished",
};

/**
 * Register all game-related socket listeners.
 * Call once (e.g. in GamePage useEffect). Returns a cleanup function.
 */
export function registerGameListeners() {
    let previousPhase = null;

    const onGameStateUpdate = (data) => {
        store.dispatch(updateGameState(data));

        const nextPhase = data?.phase || null;
        if (nextPhase && previousPhase && nextPhase !== previousPhase) {
            const label = PHASE_LABELS[nextPhase] || `Phase: ${nextPhase}`;
            store.dispatch(notify(label, "info", 2200));
        }
        previousPhase = nextPhase;
    };

    const onGameError = (error) => {
        store.dispatch(setGameError(error));
        if (error) {
            store.dispatch(notify(String(error), "danger", 3200));
        }
    };

    const onGameOver = (data) => {
        store.dispatch(updateGameState(data));
    };

    const onNextRoundReadyUpdate = (data) => {
        store.dispatch(updateNextRoundReady(data));
    };

    const onGameQuit = () => {
        store.dispatch(resetGame());
        store.dispatch(notify("Game ended", "warning", 2200));
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
        store.dispatch(notify("Series complete. Returned to lobby.", "success", 2800));
    };

    const onTrickResult = (data) => {
        const state = store.getState();
        const names = state?.game?.playerNames || {};
        const winnerId = data?.winner;
        const winnerName = names[winnerId] || winnerId?.slice?.(0, 8) || "Player";
        store.dispatch(notify(`${winnerName} won the trick`, "info", 1800));
    };

    const onPartnerRevealed = (data) => {
        const state = store.getState();
        const names = state?.game?.playerNames || {};
        const pid = data?.playerId;
        const name = names[pid] || pid?.slice?.(0, 8) || "A player";
        store.dispatch(notify(`${name} has been revealed as partner`, "success", 2600));
    };

    socket.on("game-state-update", onGameStateUpdate);
    socket.on("game-error", onGameError);
    socket.on("game-over", onGameOver);
    socket.on("next-round-ready-update", onNextRoundReadyUpdate);
    socket.on("game-quit", onGameQuit);
    socket.on("game-shuffle-status", onShuffleStatus);
    socket.on("game-series-complete", onSeriesComplete);
    socket.on("game-trick-result", onTrickResult);
    socket.on("game-partner-revealed", onPartnerRevealed);

    return () => {
        socket.off("game-state-update", onGameStateUpdate);
        socket.off("game-error", onGameError);
        socket.off("game-over", onGameOver);
        socket.off("next-round-ready-update", onNextRoundReadyUpdate);
        socket.off("game-quit", onGameQuit);
        socket.off("game-shuffle-status", onShuffleStatus);
        socket.off("game-series-complete", onSeriesComplete);
        socket.off("game-trick-result", onTrickResult);
        socket.off("game-partner-revealed", onPartnerRevealed);
    };
}

/**
 * Clear game state from Redux (e.g. when leaving a room).
 */
export function clearGameState() {
    store.dispatch(resetGame());
}
