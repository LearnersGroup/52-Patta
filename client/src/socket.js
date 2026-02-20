import { io } from "socket.io-client";

// "undefined" means the URL will be computed from the `window.location` object
const URL =
    process.env.NODE_ENV === "production" ? undefined : process.env.REACT_APP_WS_URL || 'http://localhost:4000';

export const socket = io(URL, {
    autoConnect: false,
    auth: (cb) => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            cb({ token: user ? user.token : null });
        } catch {
            cb({ token: null });
        }
    }
});

// Auto-connect if the user is already logged in (e.g. on page refresh)
try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.token) {
        socket.connect();
    }
} catch {
    // no-op
}
