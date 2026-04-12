import { socket } from "./socket";

function emitWithCallback(event, data) {
    socket.emit(event, data, (err) => {
        if (err) console.error(`WS [${event}] error:`, err);
    });
}

// --- Room Emitters ---

export const WsUserJoinRoom = (data) => emitWithCallback("user-join-room", data);
export const WsUserCreateRoom = (data) => emitWithCallback("user-create-room", data);
export const WsUserLeaveRoom = () => emitWithCallback("user-leave-room");
export const WsUserToggleReady = () => emitWithCallback("user-toggle-ready");
export const WsAdminUpdateConfig = (data) => emitWithCallback("admin-update-config", data);
export const WsAdminKickPlayer = (playerId) => emitWithCallback("admin-kick-player", { playerId });

// --- Game Play Emitters ---

export const WsGameStart = () => emitWithCallback("game-start", {});
export const WsPlaceBid = (amount) => emitWithCallback("game-place-bid", { amount });
export const WsPassBid = () => emitWithCallback("game-pass-bid", {});
export const WsSelectPowerHouse = (suit) => emitWithCallback("game-select-powerhouse", { suit });
export const WsSelectPartners = (cards, duplicateSpecs) => emitWithCallback("game-select-partners", { cards, duplicateSpecs });
export const WsPlayCard = (card) => emitWithCallback("game-play-card", { card });
export const WsNextRound = () => emitWithCallback("game-next-round", {});
export const WsRequestGameState = () => emitWithCallback("game-request-state", {});
export const WsJudgementBid = (amount) => emitWithCallback("game-judgement-bid", { amount });
export const WsProceedToShuffle = () => emitWithCallback("game-proceed-to-shuffle", {});

// --- Shuffling & Dealing Emitters ---

export const WsShuffleAction = (type) => emitWithCallback("game-shuffle-action", { type });
export const WsUndoShuffle = () => emitWithCallback("game-undo-shuffle", {});
export const WsDeal = () => emitWithCallback("game-deal", { dealType: "deal" });
export const WsQuitGame = () => emitWithCallback("game-quit", {});
export const WsReturnToLobby = () => emitWithCallback("game-return-to-lobby", {});

// --- Mendikot Emitters ---

export const WsPickClosedTrump = (position) => emitWithCallback("pick-closed-trump", { position });
export const WsRevealTrump = () => emitWithCallback("reveal-trump", {});
export const WsUserSwitchTeam = () => emitWithCallback("user-switch-team", {});
export const WsAdminRandomizeTeams = () => emitWithCallback("admin-randomize-teams", {});

// --- Username ---

export const WsSendUserName = (username) => {
    socket.emit("username", username);
};
