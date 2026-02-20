import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get_all_user_in_room } from "../../api/apiHandler";
import { useAuth } from "../hooks/useAuth";
import { socket } from "../../socket";
import { WsUserLeaveRoom, WsUserSendMsgRoom, WsUserToggleReady } from "../../api/wsEmitters";

const GamePage = () => {
    const { user } = useAuth();
    let params = useParams();
    const [roomData, setRoomData] = useState(null);
    const navigate = useNavigate();

    const handleLeave = async () => {
        try {
            WsUserLeaveRoom();
        } catch (error) {
            console.log(error);
        }
    };

    const handleMessageSend = async (message) => {
        try {
            WsUserSendMsgRoom(message);
        } catch (err) {
            console.log(err);
        }
    };

    const toggleReady = async () => {
        try {
            WsUserToggleReady();
        } catch (err) {
            console.log(err);
        }
    };

    const getRoomDetails = async () => {
        try {
            const res = await get_all_user_in_room(params.id);
            console.log(res);
            return res;
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        console.log(user);
        const onRoomMessage = (data) => {
            console.log(data);
        };
        const onFetchUsersInRoom = async () => {
            const res = await getRoomDetails();
            setRoomData(res);
        };
        const goToHomePage = (callback) => {
            navigate(`/`);
            if (typeof callback === "function") {
                let res = {};
                res.status = 200;
                callback(res);
            }
        };

        socket.on("room-message", onRoomMessage);
        socket.on("fetch-users-in-room", onFetchUsersInRoom);
        socket.on("redirect-to-home-page", goToHomePage);

        return () => {
            socket.off("room-message", onRoomMessage);
            socket.off("fetch-users-in-room", onFetchUsersInRoom);
            socket.off("redirect-to-home-page", goToHomePage);
        };
    }, []);

    const players = roomData?.players ?? [];

    return (
        <div className="game-page">
            <div className="game-header">
                <div className="game-title-block">
                    <div className="game-room-label">♠ Game Room</div>
                    <div className="game-room-id">{params.id}</div>
                </div>
                <div className="game-actions">
                    <button className="btn-ready" onClick={toggleReady}>
                        Ready
                    </button>
                    <button className="btn-danger" onClick={handleLeave}>
                        Leave
                    </button>
                </div>
            </div>

            <div className="players-card">
                <div className="players-header">
                    <h3>Players</h3>
                    <span className="players-count-badge">
                        {players.length} in room
                    </span>
                </div>

                {players.length === 0 ? (
                    <div className="players-empty">
                        Waiting for players to join...
                    </div>
                ) : (
                    <table className="players-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map((player) => {
                                const name = player.playerId?.name || "Unknown";
                                const initial = name.charAt(0).toUpperCase();
                                return (
                                    <tr key={player["_id"]}>
                                        <td>
                                            <div className="player-name-cell">
                                                <div className="player-avatar">
                                                    {initial}
                                                </div>
                                                {name}
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`status-badge ${
                                                    player.ready ? "ready" : "not-ready"
                                                }`}
                                            >
                                                {player.ready ? "Ready" : "Not Ready"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default GamePage;
