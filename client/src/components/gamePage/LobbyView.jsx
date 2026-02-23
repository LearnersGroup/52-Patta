import React from "react";
import { WsUserLeaveRoom, WsUserSendMsgRoom, WsUserToggleReady, WsGameStart } from "../../api/wsEmitters";
import { useAuth } from "../hooks/useAuth";

const LobbyView = ({ roomId, roomData, isAdmin }) => {
    const handleLeave = () => {
        try {
            WsUserLeaveRoom();
        } catch (error) {
            console.log(error);
        }
    };

    const handleMessageSend = (message) => {
        try {
            WsUserSendMsgRoom(message);
        } catch (err) {
            console.log(err);
        }
    };

    const toggleReady = () => {
        try {
            WsUserToggleReady();
        } catch (err) {
            console.log(err);
        }
    };

    const handleStartGame = () => {
        try {
            WsGameStart();
        } catch (err) {
            console.log(err);
        }
    };

    const players = roomData?.players ?? [];
    const requiredPlayers = roomData?.player_count || 4;
    const allReady = players.length >= requiredPlayers && players.every((p) => p.ready);

    return (
        <>
            <div className="game-header">
                <div className="game-title-block">
                    <div className="game-room-label">&spades; Game Room</div>
                    <div className="game-room-id">{roomId}</div>
                </div>
                <div className="game-actions">
                    {isAdmin && allReady && (
                        <button className="btn-primary" onClick={handleStartGame}>
                            Start Game
                        </button>
                    )}
                    <button className="btn-ready" onClick={toggleReady}>
                        Ready
                    </button>
                    <button className="btn-danger" onClick={handleLeave}>
                        Leave
                    </button>
                </div>
            </div>

            {roomData?.bid_threshold && (
                <div className="lobby-threshold-info">
                    <span className="threshold-label">Bid Threshold:</span>
                    <span className="threshold-badge">{roomData.bid_threshold}</span>
                    <span className="threshold-desc">Bid at or above to get an extra teammate</span>
                </div>
            )}

            <div className="players-card">
                <div className="players-header">
                    <h3>Players</h3>
                    <span className="players-count-badge">
                        {players.length} / {requiredPlayers} players
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
                                const name =
                                    player.playerId?.name || "Unknown";
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
                                                    player.ready
                                                        ? "ready"
                                                        : "not-ready"
                                                }`}
                                            >
                                                {player.ready
                                                    ? "Ready"
                                                    : "Not Ready"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};

export default LobbyView;
