import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectionState } from "../websocket/ConnectionState";
import { Events } from "../websocket/Events";
import { ConnectionManager } from "../websocket/ConnectionManager";
import { MyForm } from "../websocket/MyForm";
import { getSocket } from "../../socket";
import { useAuth } from "../hooks/useAuth";
import { removeAuthToken } from "../../api/apiHandler";
import AllGameRooms from "./AllGameRooms/AllGameRooms";
import { WsSendUserName } from "../../api/wsEmitters";
import { useDispatch } from "react-redux";
import { notify } from "../../redux/slices/alert";

const HomePage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const socket = getSocket();
    const [isConnected, setIsConnected] = useState(socket ? socket.connected : false);
    const [fooEvents, setFooEvents] = useState([]);
    const [rejoinInfo, setRejoinInfo] = useState(null);

    const handleLogout = () => {
        removeAuthToken();
        logout();
    };

    const handleClick = () => {
        notify("test", "success")(dispatch);
    };

    const handleRejoin = (info) => {
        if (!socket || !info) return;
        socket.emit("user-join-room", { roomname: info.roomname, id: info.roomId }, (err) => {
            if (err) {
                console.error("Rejoin failed:", err);
                notify("Failed to rejoin game", "error")(dispatch);
                setRejoinInfo(null);
            }
        });
    };

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onFooEvent(value) {
            setFooEvents((previous) => [...previous, value]);
        }

        function onRejoinAvailable(data) {
            setRejoinInfo(data);
            // Auto-rejoin: trigger join immediately
            if (socket) {
                socket.emit("user-join-room", { roomname: data.roomname, id: data.roomId }, (err) => {
                    if (err) {
                        console.error("Auto-rejoin failed:", err);
                        // Banner remains visible as fallback
                    }
                });
            }
        }

        if (socket) {
            socket.on("connect", onConnect);
            socket.on("disconnect", onDisconnect);
            socket.on("message", onFooEvent);
            socket.on("rejoin-available", onRejoinAvailable);
            WsSendUserName(user.user_name);
        }

        return () => {
            if (socket) {
                socket.off("connect", onConnect);
                socket.off("disconnect", onDisconnect);
                socket.off("message", onFooEvent);
                socket.off("rejoin-available", onRejoinAvailable);
            }
        };
    }, []);

    return (
        <div className="lobby-page">
            <nav className="navbar">
                <div className="navbar-brand">
                    <span className="suit-red">♥</span>
                    <span className="navbar-logo">52-Patta</span>
                    <span className="suit-black">♠</span>
                </div>
                <div className="navbar-user">
                    <span className="navbar-username">
                        ♦ {user.user_name}
                    </span>
                    <button className="btn-outline" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="lobby-main">
                <div className="lobby-welcome">
                    <div className="welcome-card-icon">🃏</div>
                    <div className="welcome-text">
                        <h2>Welcome back, {user.user_name}!</h2>
                        <p>Join an existing room or create a new game below.</p>
                    </div>
                </div>

                {rejoinInfo && (
                    <div className="rejoin-banner">
                        <div className="rejoin-info">
                            <span className="rejoin-icon">🃏</span>
                            <div className="rejoin-text">
                                You have an active game in <strong>{rejoinInfo.roomname}</strong>
                            </div>
                        </div>
                        <button className="btn-primary" onClick={() => handleRejoin(rejoinInfo)}>
                            Rejoin Game
                        </button>
                    </div>
                )}

                <AllGameRooms />
            </main>

            <div className="debug-section">
                <details>
                    <summary>Developer Tools</summary>
                    <div>
                        <ConnectionState isConnected={isConnected} />
                        <Events events={fooEvents} />
                        <ConnectionManager />
                        <MyForm />
                        <button
                            className="btn-secondary"
                            onClick={handleClick}
                            style={{ marginTop: "8px" }}
                        >
                            Test Alert
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default HomePage;
