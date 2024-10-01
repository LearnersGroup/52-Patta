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

//CAUTION: do not touch fragile!
//even though there is a middleware setup we need it, SOMEHOW!
export const WsSendUserName = (username) => {
    const current_user = JSON.parse(localStorage.getItem("user"));
    socket.handshake = { auth : {}};
    socket.auth = { token: current_user["token"] };
    socket.emit("username", username);
};
