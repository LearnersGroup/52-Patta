import { socket } from "../socket";

export const handleUserJoin = (data) => {
    socket.on("room-message", data);
}
