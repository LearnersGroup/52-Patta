import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WsUserCreateRoom } from "../../api/wsEmitters";
import { socket } from "../../socket";
import { useAuth } from "../hooks/useAuth";

// ─── Client-side config (mirrors server game_engine/config.js) ───────────────

function isDeckCountValid(playerCount, deckCount) {
    const removeTwos = (52 * deckCount) % playerCount;
    return removeTwos <= 4 * deckCount;
}

function computeClientConfig(playerCount, deckCount) {
    if (!isDeckCountValid(playerCount, deckCount)) return null;
    const N = playerCount;
    const D = deckCount;
    const baseCards = 52 * D;
    const removeTwos = baseCards % N;
    const totalCards = baseCards - removeTwos;
    const cardsPerPlayer = totalCards / N;
    const bidStart = D === 1 ? 150 : 300;
    const bidMax   = D === 1 ? 250 : 500;
    const isOdd    = N % 2 === 1;
    const bidTeamDefault    = Math.floor(N / 2);
    const opposeTeamDefault = Math.ceil(N / 2);
    const partnerCards = bidTeamDefault - 1;
    const bidThresholdDefault = isOdd
        ? Math.round(((bidStart + bidMax) / 2) / 5) * 5
        : null;
    return {
        totalCards, cardsPerPlayer, rounds: cardsPerPlayer,
        bidStart, bidMax, isOdd,
        bidTeamDefault, opposeTeamDefault, partnerCards,
        bidThresholdDefault,
        defaultTeams:   `${bidTeamDefault} vs ${opposeTeamDefault}`,
        advantageTeams: `${opposeTeamDefault} vs ${bidTeamDefault}`,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateGamePage = () => {
    const navigate = useNavigate();
    const { user }                      = useAuth();
    const roomName                      = `${user?.user_name || "Player"}'s Room`;
    const [pass, setPass]               = useState("");
    const [isPublic, setIsPublic]       = useState(false);
    const [errors, setErrors]           = useState([]);
    const [playerCount, setPlayerCount] = useState(4);
    const [deckCount, setDeckCount]     = useState(1);
    const [bidThreshold, setBidThreshold] = useState(null);
    const [gameCount, setGameCount]     = useState(4);
    const [bidWindow, setBidWindow]     = useState(15);

    const config      = useMemo(() => computeClientConfig(playerCount, deckCount), [playerCount, deckCount]);
    const oneDeckOk   = useMemo(() => isDeckCountValid(playerCount, 1),            [playerCount]);

    // Auto-switch to 2 decks when 1 deck becomes invalid; reset bid threshold
    useEffect(() => {
        if (!isDeckCountValid(playerCount, deckCount)) {
            setDeckCount(2);
        }
    }, [playerCount]);

    // Reset bid threshold whenever the computed config changes (player count or deck count change)
    useEffect(() => {
        const cfg = computeClientConfig(playerCount, deckCount);
        if (cfg?.isOdd) {
            setBidThreshold(cfg.bidThresholdDefault);
        } else {
            setBidThreshold(null);
        }
    }, [playerCount, deckCount]);

    // ── Steppers ────────────────────────────────────────────────────────────

    const adjustPlayerCount = (delta) => {
        const next = Math.max(4, Math.min(13, playerCount + delta));
        setPlayerCount(next);
        setGameCount(next); // keep game count in sync with player count default
    };

    const adjustGameCount  = (delta) => setGameCount(prev => Math.max(1, Math.min(20, prev + delta)));
    const adjustBidWindow  = (delta) => setBidWindow(prev => Math.max(5, Math.min(60, prev + delta)));

    const adjustThreshold = (delta) => {
        if (!config?.isOdd) return;
        const step = 5;
        const min  = config.bidStart + step;
        const max  = config.bidMax;
        setBidThreshold(prev => {
            const next = (prev ?? config.bidThresholdDefault) + delta;
            return Math.max(min, Math.min(max, next));
        });
    };

    // ── Socket ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const goToGamePage = (room_id, callback) => {
            navigate(`/game-room/${room_id}`);
            callback({ status: 200 });
        };
        socket.on("redirect-to-game-room", goToGamePage);
        return () => socket.off("redirect-to-game-room", goToGamePage);
    }, []);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleCreateRoom = () => {
        const data = {
            roomname:     roomName,
            roompass:     isPublic ? "" : pass,
            isPublic:     isPublic,
            player_count: playerCount,
            deck_count:   deckCount,
            game_count:   gameCount,
            bid_window:   bidWindow,
        };
        if (config?.isOdd && bidThreshold) {
            data.bid_threshold = bidThreshold;
        }
        try {
            WsUserCreateRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors || []);
        }
    };

    const thresholdValue = bidThreshold ?? config?.bidThresholdDefault ?? 200;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="create-page">
            <div className="create-card">
                <div className="create-header">
                    <span className="create-icon">&spades;</span>
                    <h2>Create Room</h2>
                    <p>Set up a new game and invite your friends</p>
                </div>

                <div className="create-form">

                    {/* Room Name (auto-filled) */}
                    <div className="form-group">
                        <label>Room Name</label>
                        <div className="room-name-display">{roomName}</div>
                    </div>

                    {/* Private / Public toggle */}
                    <div className="form-group">
                        <label>Visibility</label>
                        <div className="visibility-toggle">
                            <button
                                className={`visibility-btn ${!isPublic ? "active" : ""}`}
                                onClick={() => setIsPublic(false)}
                            >
                                🔒 Private
                            </button>
                            <button
                                className={`visibility-btn ${isPublic ? "active" : ""}`}
                                onClick={() => setIsPublic(true)}
                            >
                                🌐 Public
                            </button>
                        </div>
                        <div className="visibility-hint">
                            {isPublic
                                ? "Anyone can join without a password"
                                : "Only players with the password can join"}
                        </div>
                    </div>

                    {/* Room Password (private only) */}
                    {!isPublic && (
                        <div className="form-group">
                            <label>Room Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                placeholder="Set a room password (min 6 chars)"
                            />
                        </div>
                    )}

                    {/* Player Count */}
                    <div className="form-group">
                        <label>Players</label>
                        <div className="game-count-widget">
                            <button
                                className="bid-adjust"
                                onClick={() => adjustPlayerCount(-1)}
                                disabled={playerCount <= 4}
                            >
                                &minus;
                            </button>
                            <span className="threshold-value">{playerCount}</span>
                            <button
                                className="bid-adjust"
                                onClick={() => adjustPlayerCount(1)}
                                disabled={playerCount >= 13}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Deck Count */}
                    <div className="form-group">
                        <label>Decks</label>
                        <div className="deck-toggle">
                            <button
                                className={`deck-btn ${deckCount === 1 ? "active" : ""}`}
                                onClick={() => setDeckCount(1)}
                                disabled={!oneDeckOk}
                                title={!oneDeckOk ? `${playerCount} players require 2 decks` : ""}
                            >
                                1 Deck
                            </button>
                            <button
                                className={`deck-btn ${deckCount === 2 ? "active" : ""}`}
                                onClick={() => setDeckCount(2)}
                            >
                                2 Decks
                            </button>
                        </div>
                        {!oneDeckOk && (
                            <div className="deck-warning">
                                {playerCount} players require 2 decks (not enough twos to remove with 1 deck)
                            </div>
                        )}
                    </div>

                    {/* Computed game info */}
                    {config && (
                        <div className="game-info-row">
                            <span>{config.totalCards} cards</span>
                            <span className="game-info-dot">&middot;</span>
                            <span>{config.cardsPerPlayer} cards/player</span>
                            <span className="game-info-dot">&middot;</span>
                            <span>{config.rounds} rounds</span>
                            <span className="game-info-dot">&middot;</span>
                            <span>{config.partnerCards} partner card{config.partnerCards !== 1 ? "s" : ""}</span>
                        </div>
                    )}

                    {/* Bid Threshold (odd player counts only) */}
                    {config?.isOdd && (
                        <div className="form-group">
                            <label>Bid Threshold for Extra Teammate</label>
                            <div className="threshold-info">
                                Below {thresholdValue}: teams are {config.defaultTeams}&ensp;&mdash;&ensp;
                                At or above: teams flip to {config.advantageTeams}
                            </div>
                            <div className="threshold-widget">
                                <button
                                    className="bid-adjust"
                                    onClick={() => adjustThreshold(-5)}
                                    disabled={thresholdValue <= config.bidStart + 5}
                                >
                                    &minus;
                                </button>
                                <span className="threshold-value">{thresholdValue}</span>
                                <button
                                    className="bid-adjust"
                                    onClick={() => adjustThreshold(5)}
                                    disabled={thresholdValue >= config.bidMax}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Number of Games */}
                    <div className="form-group">
                        <label>Number of Games</label>
                        <div className="game-count-widget">
                            <button
                                className="bid-adjust"
                                onClick={() => adjustGameCount(-1)}
                                disabled={gameCount <= 1}
                            >
                                &minus;
                            </button>
                            <span className="threshold-value">{gameCount}</span>
                            <button
                                className="bid-adjust"
                                onClick={() => adjustGameCount(1)}
                                disabled={gameCount >= 20}
                            >
                                +
                            </button>
                        </div>
                        <div className="game-count-info">
                            Play {gameCount} game{gameCount !== 1 ? "s" : ""} in a series (default: {playerCount})
                        </div>
                    </div>

                    {/* Bidding Window */}
                    <div className="form-group">
                        <label>Bidding Window</label>
                        <div className="game-count-widget">
                            <button
                                className="bid-adjust"
                                onClick={() => adjustBidWindow(-5)}
                                disabled={bidWindow <= 5}
                            >
                                &minus;
                            </button>
                            <span className="threshold-value">{bidWindow}s</span>
                            <button
                                className="bid-adjust"
                                onClick={() => adjustBidWindow(5)}
                                disabled={bidWindow >= 60}
                            >
                                +
                            </button>
                        </div>
                        <div className="game-count-info">
                            Time each player has to bid after the last bid (5&ndash;60s)
                        </div>
                    </div>

                    {errors.length !== 0 && (
                        <div className="form-errors">
                            {errors.map((err, i) => (
                                <p key={err.path || i} className="form-error">{err.msg || err}</p>
                            ))}
                        </div>
                    )}

                    <div className="create-actions">
                        <button className="btn-secondary" onClick={() => navigate("/")}>
                            Back
                        </button>
                        <button className="btn-primary" onClick={handleCreateRoom}>
                            Create Room
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CreateGamePage;
