import { socket } from "../socket";

export const WsUserJoinRoom = (data) => {
    const callback = (err) => {
        if (err) {
            console.error("WS - join room err - ", err);
        }
    };
    socket.emit("user-join-room", data, callback);
};

export const WsUserCreateRoom = (data) => {
    const callback = (err) => {
        if (err) {
            console.error("WS - create room err - ", err);
        }
    };
    socket.emit("user-create-room", data, callback);
};

export const WsUserLeaveRoom = () => {
    const callback = (err) => {
        if (err) {
            console.error("WS - leave room err - ", err);
        }
    };
    socket.emit("user-leave-room", callback);
};

export const WsUserSendMsgRoom = (message) => {
    const callback = (err) => {
        if (err) {
            console.error("WS - send msg err - ", err);
        }
    };
    socket.emit("user-message-room", message, callback);
}

export const WsUserToggleReady = (data) => {
    const callback = (err) => {
        if (err) {
            console.error("WS - toggle ready err - ", err);
        }
    };
    socket.emit("user-toggle-ready", callback);
}

// --- Game Play Emitters ---

export const WsGameStart = () => {
    const callback = (err) => {
        if (err) console.error("WS - game start err - ", err);
    };
    socket.emit("game-start", {}, callback);
};

export const WsPlaceBid = (amount) => {
    const callback = (err) => {
        if (err) console.error("WS - place bid err - ", err);
    };
    socket.emit("game-place-bid", { amount }, callback);
};

export const WsPassBid = () => {
    const callback = (err) => {
        if (err) console.error("WS - pass bid err - ", err);
    };
    socket.emit("game-pass-bid", {}, callback);
};

export const WsSelectPowerHouse = (suit) => {
    const callback = (err) => {
        if (err) console.error("WS - select powerhouse err - ", err);
    };
    socket.emit("game-select-powerhouse", { suit }, callback);
};

export const WsSelectPartners = (cards, duplicateSpecs) => {
    const callback = (err) => {
        if (err) console.error("WS - select partners err - ", err);
    };
    socket.emit("game-select-partners", { cards, duplicateSpecs }, callback);
};

export const WsPlayCard = (card) => {
    const callback = (err) => {
        if (err) console.error("WS - play card err - ", err);
    };
    socket.emit("game-play-card", { card }, callback);
};

export const WsNextRound = () => {
    const callback = (err) => {
        if (err) console.error("WS - next round err - ", err);
    };
    socket.emit("game-next-round", {}, callback);
};

export const WsRequestGameState = () => {
    const callback = (err) => {
        if (err) console.error("WS - request state err - ", err);
    };
    socket.emit("game-request-state", {}, callback);
};

export const WsQuitGame = () => {
    const callback = (err) => {
        if (err) console.error("WS - quit game err - ", err);
    };
    socket.emit("game-quit", {}, callback);
};

//CAUTION: do not touch fragile!
//even though there is a middleware setup we need it, SOMEHOW!
export const WsSendUserName = (username) => {
    const current_user = JSON.parse(localStorage.getItem("user"));
    socket.handshake = { auth : {}};
    socket.auth = { token: current_user["token"] };
    socket.emit("username", username);
};
