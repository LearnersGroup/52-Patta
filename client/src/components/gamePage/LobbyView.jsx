import { useState } from "react";
import { WsUserLeaveRoom, WsUserToggleReady, WsGameStart } from "../../api/wsEmitters";

const LobbyView = ({ roomId, roomData, isAdmin, userId }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (!roomData?.code) return;
        navigator.clipboard.writeText(roomData.code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleLeave = () => {
        try { WsUserLeaveRoom(); } catch (e) { console.log(e); }
    };

    const toggleReady = () => {
        try { WsUserToggleReady(); } catch (e) { console.log(e); }
    };

    const handleStartGame = () => {
        try { WsGameStart(); } catch (e) { console.log(e); }
    };

    const players = roomData?.players ?? [];
    const requiredPlayers = roomData?.player_count || 4;
    const allReady = players.length >= requiredPlayers && players.every((p) => p.ready);

    const myEntry = players.find((p) => p.playerId?._id === userId || p.playerId?.toString() === userId);
    const iAmReady = myEntry?.ready ?? false;

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
                    <button
                        className={iAmReady ? "btn-ready btn-ready--active" : "btn-ready"}
                        onClick={toggleReady}
                    >
                        {iAmReady ? "Not Ready" : "Ready"}
                    </button>
                    <button className="btn-danger" onClick={handleLeave}>
                        Leave
                    </button>
                </div>
            </div>

            {roomData?.code && (
                <div className="room-code-banner">
                    <span className="room-code-label">Room Code</span>
                    <span className="room-code-value">{roomData.code}</span>
                    <button className="room-code-copy" onClick={handleCopyCode}>
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            )}

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
                    <div className="lobby-players-grid">
                        {players.map((player) => {
                            const name = player.playerId?.name || "Unknown";
                            const initial = name.charAt(0).toUpperCase();
                            const avatar = player.playerId?.avatar || "";
                            return (
                                <div key={player["_id"]} className={`lobby-player-block${player.ready ? " lobby-player-block--ready" : ""}`}>
                                    <div className="lobby-player-avatar-wrap">
                                        <div className="lobby-player-avatar">
                                            {avatar ? (
                                                <img src={avatar} alt={`${name} avatar`} />
                                            ) : (
                                                <span>{initial}</span>
                                            )}
                                        </div>
                                        <div className={`lobby-player-ready-badge${player.ready ? " lobby-player-ready-badge--ready" : ""}`}>
                                            {player.ready ? "✓" : "○"}
                                        </div>
                                        <div className="lobby-player-name-badge">{name}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default LobbyView;
