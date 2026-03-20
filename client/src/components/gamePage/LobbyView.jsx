import { useEffect, useState } from "react";
import {
    WsUserLeaveRoom,
    WsUserToggleReady,
    WsGameStart,
    WsAdminUpdateConfig,
    WsAdminKickPlayer,
} from "../../api/wsEmitters";
import RoomConfigForm from "./RoomConfigForm";

const LobbyView = ({ roomId, roomData, isAdmin, userId }) => {
    const [copied, setCopied] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [confirmKick, setConfirmKick] = useState(null); // { playerId, name }
    const [confirmClose, setConfirmClose] = useState(false);

    const [localGameType, setLocalGameType] = useState("kaliteri");
    const [localPlayerCount, setLocalPlayerCount] = useState(4);
    const [localDeckCount, setLocalDeckCount] = useState(1);
    const [localBidThreshold, setLocalBidThreshold] = useState(null);
    const [localGameCount, setLocalGameCount] = useState(4);
    const [localBidWindow, setLocalBidWindow] = useState(15);
    const [localInspectTime, setLocalInspectTime] = useState(15);
    const [localMaxCardsPerRound, setLocalMaxCardsPerRound] = useState(7);
    const [localReverseOrder, setLocalReverseOrder] = useState(true);
    const [localTrumpMode, setLocalTrumpMode] = useState("fixed");
    const [localScoreboardTime, setLocalScoreboardTime] = useState(5);
    const [localBidTimeEnabled, setLocalBidTimeEnabled] = useState(false);
    const [localBidTime, setLocalBidTime] = useState(15);
    const [localCardRevealTime, setLocalCardRevealTime] = useState(10);

    const players = roomData?.players ?? [];

    const initializeLocalConfig = () => {
        const gameType = roomData?.game_type || "kaliteri";
        const defaultMin = gameType === "judgement" ? 3 : 4;
        const currentPlayers = players.length;

        setLocalGameType(gameType);
        setLocalPlayerCount(Math.max(roomData?.player_count ?? defaultMin, currentPlayers));
        setLocalDeckCount(roomData?.deck_count ?? (gameType === "judgement" ? 1 : 1));
        setLocalBidThreshold(roomData?.bid_threshold ?? null);
        setLocalGameCount(roomData?.game_count ?? (roomData?.player_count ?? defaultMin));
        setLocalBidWindow(roomData?.bid_window ?? 15);
        setLocalInspectTime(roomData?.inspect_time ?? 15);
        setLocalMaxCardsPerRound(roomData?.max_cards_per_round ?? 7);
        setLocalReverseOrder(roomData?.reverse_order ?? true);
        setLocalTrumpMode(roomData?.trump_mode || "fixed");
        setLocalScoreboardTime(roomData?.scoreboard_time ?? 5);
        setLocalBidTimeEnabled(roomData?.judgement_bid_time !== null && roomData?.judgement_bid_time !== undefined);
        setLocalBidTime(roomData?.judgement_bid_time ?? 15);
        setLocalCardRevealTime(roomData?.card_reveal_time ?? 10);
    };

    useEffect(() => {
        if (settingsOpen) {
            initializeLocalConfig();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsOpen]);

    const handleCopyCode = () => {
        if (!roomData?.code) return;
        navigator.clipboard.writeText(roomData.code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleLeave = () => {
        if (isAdmin) {
            setConfirmClose(true);
        } else {
            try { WsUserLeaveRoom(); } catch (e) { console.log(e); }
        }
    };

    const toggleReady = () => {
        try { WsUserToggleReady(); } catch (e) { console.log(e); }
    };

    const handleStartGame = () => {
        try { WsGameStart(); } catch (e) { console.log(e); }
    };

    const requiredPlayers = roomData?.player_count || 4;
    const gameType = roomData?.game_type || "kaliteri";
    const gameTypeLabel = gameType === "judgement" ? "Judgement" : "Kaliteri";
    const allReady = players.length >= requiredPlayers && players.every((p) => p.ready);

    const myEntry = players.find((p) => p.playerId?._id === userId || p.playerId?.toString() === userId);
    const iAmReady = myEntry?.ready ?? false;

    const handleSaveConfig = () => {
        try {
            WsAdminUpdateConfig({
                game_type: localGameType,
                player_count: localPlayerCount,
                deck_count: localDeckCount,
                bid_threshold: localBidThreshold,
                game_count: localGameCount,
                bid_window: localBidWindow,
                inspect_time: localInspectTime,
                max_cards_per_round: localMaxCardsPerRound,
                reverse_order: localReverseOrder,
                trump_mode: localTrumpMode,
                scoreboard_time: localScoreboardTime,
                judgement_bid_time: localBidTimeEnabled ? localBidTime : null,
                card_reveal_time: localCardRevealTime,
            });
            setSettingsOpen(false);
        } catch (e) {
            console.log(e);
        }
    };

    const handleKickPlayer = (playerId, name) => {
        if (!playerId) return;
        setConfirmKick({ playerId, name });
    };

    const confirmKickPlayer = () => {
        if (!confirmKick) return;
        try { WsAdminKickPlayer(confirmKick.playerId); } catch (e) { console.log(e); }
        setConfirmKick(null);
    };

    const confirmCloseRoom = () => {
        try { WsUserLeaveRoom(); } catch (e) { console.log(e); }
        setConfirmClose(false);
    };

    return (
        <>
            {confirmClose && (
                <div className="quit-confirm-overlay">
                    <div className="quit-confirm-dialog">
                        <h3>Close Room?</h3>
                        <p>You are the admin. Leaving will close the room and remove all players.</p>
                        <div className="quit-confirm-actions">
                            <button className="btn-secondary" onClick={() => setConfirmClose(false)}>Cancel</button>
                            <button className="btn-danger" onClick={confirmCloseRoom}>Close Room</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmKick && (
                <div className="quit-confirm-overlay">
                    <div className="quit-confirm-dialog">
                        <h3>Remove Player?</h3>
                        <p><strong>{confirmKick.name}</strong> will be removed from the room.</p>
                        <div className="quit-confirm-actions">
                            <button className="btn-secondary" onClick={() => setConfirmKick(null)}>Cancel</button>
                            <button className="btn-danger" onClick={confirmKickPlayer}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="game-header">
                <div className="game-title-block">
                    <div className="game-room-label">&spades; Game Room</div>
                    <div className="game-room-id">{roomId}</div>
                    <div className={`game-type-badge game-type-${gameType}`}>
                        {gameTypeLabel}
                    </div>
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
                <div className={`room-code-banner${settingsOpen ? " room-code-banner--expanded" : ""}`}>
                    <div className="room-code-row">
                        <span className="room-code-label">Room Code</span>
                        <span className="room-code-value">{roomData.code}</span>
                        <button className="room-code-copy" onClick={handleCopyCode}>
                            {copied ? "Copied!" : "Copy"}
                        </button>
                        {isAdmin && (
                            <button
                                className={`room-code-settings${settingsOpen ? " room-code-settings--active" : ""}`}
                                onClick={() => setSettingsOpen((prev) => !prev)}
                                title="Room Settings"
                            >
                                ⚙
                            </button>
                        )}
                    </div>

                    {settingsOpen && (
                        <div className="room-settings-panel">
                            <RoomConfigForm
                                gameType={localGameType}
                                setGameType={setLocalGameType}
                                playerCount={localPlayerCount}
                                setPlayerCount={setLocalPlayerCount}
                                deckCount={localDeckCount}
                                setDeckCount={setLocalDeckCount}
                                bidThreshold={localBidThreshold}
                                setBidThreshold={setLocalBidThreshold}
                                gameCount={localGameCount}
                                setGameCount={setLocalGameCount}
                                bidWindow={localBidWindow}
                                setBidWindow={setLocalBidWindow}
                                inspectTime={localInspectTime}
                                setInspectTime={setLocalInspectTime}
                                maxCardsPerRound={localMaxCardsPerRound}
                                setMaxCardsPerRound={setLocalMaxCardsPerRound}
                                reverseOrder={localReverseOrder}
                                setReverseOrder={setLocalReverseOrder}
                                trumpMode={localTrumpMode}
                                setTrumpMode={setLocalTrumpMode}
                                scoreboardTime={localScoreboardTime}
                                setScoreboardTime={setLocalScoreboardTime}
                                bidTimeEnabled={localBidTimeEnabled}
                                setBidTimeEnabled={setLocalBidTimeEnabled}
                                bidTime={localBidTime}
                                setBidTime={setLocalBidTime}
                                cardRevealTime={localCardRevealTime}
                                setCardRevealTime={setLocalCardRevealTime}
                                minPlayerCount={players.length}
                                showRoomName={false}
                            />
                            <div className="room-settings-actions">
                                <button className="btn-secondary" onClick={() => setSettingsOpen(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleSaveConfig}>Save Changes</button>
                            </div>
                        </div>
                    )}
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
                            const playerEntryId = player.playerId?._id?.toString?.() || player.playerId?.toString?.();

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

                                        {isAdmin && playerEntryId !== userId && (
                                            <button
                                                className="lobby-player-kick"
                                                onClick={() => handleKickPlayer(playerEntryId, name)}
                                                title={`Remove ${name}`}
                                            >
                                                −
                                            </button>
                                        )}

                                        <div className="lobby-player-name-row">
                                            <span className={`lobby-player-ready-dot${player.ready ? " lobby-player-ready-dot--ready" : ""}`} />
                                            <span className="lobby-player-name-badge">{name}</span>
                                        </div>
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
