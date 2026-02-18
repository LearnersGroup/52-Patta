import { io } from "socket.io-client";

// "undefined" means the URL will be computed from the `window.location` object
const URL =
    process.env.NODE_ENV === "production" ? undefined : process.env.REACT_APP_WS_URL || 'http://localhost:4000';

let socketInstance = null;

export function getSocket() {
    if (!socketInstance) {
        const userData = localStorage.getItem("user");
        if (!userData) {
            return null;
        }
        socketInstance = io(URL, {
            auth: (cb) => {
                const user = JSON.parse(localStorage.getItem("user"));
                cb({ token: user ? user.token : null });
            }
        });
    }
    return socketInstance;
}

export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}

// Backward-compatible export (lazy initialized)
export const socket = null;