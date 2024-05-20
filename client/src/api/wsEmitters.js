import { socket } from "../socket";

export const WsUserJoinRoom = (data) => {
    const callback = (err) => {
        if (err) {
            console.error("WS - join room err - ", err);
        }
    };
    socket.emit("user-join-room", data, callback);
};

export const WsSendUserName = (username) => {
    const current_user = JSON.parse(localStorage.getItem("user"));
    socket.handshake = { auth : {}};
    socket.auth = { token: current_user["token"] };
    socket.emit("username", username);
};
