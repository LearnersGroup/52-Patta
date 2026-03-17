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

function computeJudgementPreview(playerCount, deckCount, maxCardsPerRound, reverseOrder) {
    const maxPossible = Math.floor((52 * deckCount) / playerCount);
    const maxCards = Math.max(1, Math.min(maxPossible, maxCardsPerRound || maxPossible));
    const ascending = Array.from({ length: maxCards }, (_, i) => i + 1);
    const descending = reverseOrder && maxCards > 1
        ? Array.from({ length: maxCards - 1 }, (_, i) => maxCards - 1 - i)
        : [];
    const roundSequence = [...ascending, ...descending];
    return {
        maxPossible,
        maxCards,
        roundSequence,
        totalRounds: roundSequence.length,
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateGamePage = () => {
    const navigate = useNavigate();
    const { user }                      = useAuth();
    const roomName                      = `${user?.user_name || "Player"}'s Room`;
    const [errors, setErrors]           = useState([]);
    const [gameType, setGameType]       = useState("kaliteri");
    const [playerCount, setPlayerCount] = useState(4);
    const [deckCount, setDeckCount]     = useState(1);
    const [bidThreshold, setBidThreshold] = useState(null);
    const [gameCount, setGameCount]     = useState(4);
    const [bidWindow, setBidWindow]     = useState(15);
    const [inspectTime, setInspectTime] = useState(15);
    const [maxCardsPerRound, setMaxCardsPerRound] = useState(1);
    const [reverseOrder, setReverseOrder] = useState(false);

    const config      = useMemo(() => computeClientConfig(playerCount, deckCount), [playerCount, deckCount]);
    const oneDeckOk   = useMemo(() => isDeckCountValid(playerCount, 1),            [playerCount]);
    const judgementPreview = useMemo(
        () => computeJudgementPreview(playerCount, deckCount, maxCardsPerRound, reverseOrder),
        [playerCount, deckCount, maxCardsPerRound, reverseOrder]
    );

    // Auto-switch to 2 decks when 1 deck becomes invalid; reset bid threshold
    useEffect(() => {
        if (gameType === "judgement") {
            if (playerCount <= 6 && deckCount !== 1) setDeckCount(1);
            if (playerCount >= 7 && deckCount !== 2) setDeckCount(2);
            return;
        }
        if (!isDeckCountValid(playerCount, deckCount)) {
            setDeckCount(2);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerCount, gameType]);

    // Reset bid threshold whenever the computed config changes (player count or deck count change)
    useEffect(() => {
        if (gameType !== "kaliteri") return;
        const cfg = computeClientConfig(playerCount, deckCount);
        if (cfg?.isOdd) {
            setBidThreshold(cfg.bidThresholdDefault);
        } else {
            setBidThreshold(null);
        }
    }, [playerCount, deckCount, gameType]);

    useEffect(() => {
        if (gameType !== "judgement") return;
        setBidThreshold(null);
        setGameCount(playerCount);
        setBidWindow(15);
        setInspectTime(15);
        setMaxCardsPerRound((prev) => {
            const maxPossible = Math.floor((52 * deckCount) / playerCount);
            if (!prev || prev < 1 || prev > maxPossible) return maxPossible;
            return prev;
        });
    }, [gameType, playerCount, deckCount]);

    useEffect(() => {
        if (gameType === "kaliteri" && playerCount < 4) {
            setPlayerCount(4);
            setGameCount(4);
        }
    }, [gameType, playerCount]);

    // ── Steppers ────────────────────────────────────────────────────────────

    const adjustPlayerCount = (delta) => {
        const minPlayers = gameType === "judgement" ? 3 : 4;
        const next = Math.max(minPlayers, Math.min(13, playerCount + delta));
        setPlayerCount(next);
        setGameCount(next); // keep game count in sync with player count default
    };

    const adjustGameCount   = (delta) => setGameCount(prev => Math.max(1, Math.min(20, prev + delta)));
    const adjustBidWindow   = (delta) => setBidWindow(prev => Math.max(5, Math.min(60, prev + delta)));
    const adjustInspectTime = (delta) => setInspectTime(prev => Math.max(5, Math.min(30, prev + delta)));

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

    const adjustMaxCards = (delta) => {
        const maxPossible = Math.floor((52 * deckCount) / playerCount);
        setMaxCardsPerRound((prev) => Math.max(1, Math.min(maxPossible, prev + delta)));
    };

    // ── Socket ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const goToGamePage = (room_id, callback) => {
            navigate(`/game-room/${room_id}`);
            callback({ status: 200 });
        };
        socket.on("redirect-to-game-room", goToGamePage);
        return () => socket.off("redirect-to-game-room", goToGamePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleCreateRoom = () => {
        const data = {
            roomname:     roomName,
            player_count: playerCount,
            game_type: gameType,
            deck_count:   deckCount,
        };
        if (gameType === "kaliteri") {
            data.game_count = gameCount;
            data.bid_window = bidWindow;
            data.inspect_time = inspectTime;
            if (config?.isOdd && bidThreshold) {
                data.bid_threshold = bidThreshold;
            }
        } else {
            data.max_cards_per_round = maxCardsPerRound;
            data.reverse_order = reverseOrder;
        }
        try {
            WsUserCreateRoom(data);
        } catch (error) {
            console.log(error);
            setErrors(error.errors || []);
        }
    };

    const thresholdValue = bidThreshold ?? config?.bidThresholdDefault ?? 200;
    const minPlayers = gameType === "judgement" ? 3 : 4;

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

                    {/* Game Type */}
                    <div className="form-group">
                        <label>Game Type</label>
                        <div className="deck-toggle">
                            <button
                                className={`deck-btn ${gameType === "kaliteri" ? "active" : ""}`}
                                onClick={() => setGameType("kaliteri")}
                            >
                                Kaliteri
                            </button>
                            <button
                                className={`deck-btn ${gameType === "judgement" ? "active" : ""}`}
                                onClick={() => setGameType("judgement")}
                            >
                                Judgement
                            </button>
                        </div>
                    </div>

                    {/* Room Name (auto-filled) */}
                    <div className="form-group">
                        <label>Room Name</label>
                        <div className="room-name-display">{roomName}</div>
                    </div>

                    {/* Player Count */}
                    <div className="form-group">
                        <label>Players</label>
                        <div className="game-count-widget">
                            <button
                                className="bid-adjust"
                                onClick={() => adjustPlayerCount(-1)}
                                disabled={playerCount <= minPlayers}
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
                                disabled={gameType === "judgement" ? playerCount >= 7 : !oneDeckOk}
                                title={
                                    gameType === "judgement"
                                        ? (playerCount >= 7 ? "Judgement uses 2 decks for 7+ players" : "")
                                        : (!oneDeckOk ? `${playerCount} players require 2 decks` : "")
                                }
                            >
                                1 Deck
                            </button>
                            <button
                                className={`deck-btn ${deckCount === 2 ? "active" : ""}`}
                                onClick={() => setDeckCount(2)}
                                disabled={gameType === "judgement" ? playerCount <= 6 : false}
                            >
                                2 Decks
                            </button>
                        </div>
                        {gameType === "kaliteri" && !oneDeckOk && (
                            <div className="deck-warning">
                                {playerCount} players require 2 decks (not enough twos to remove with 1 deck)
                            </div>
                        )}
                        {gameType === "judgement" && (
                            <div className="deck-warning">
                                {playerCount <= 6
                                    ? "Judgement with 3-6 players uses 1 deck"
                                    : "Judgement with 7+ players uses 2 decks"}
                            </div>
                        )}
                    </div>

                    {/* Computed game info */}
                    {gameType === "kaliteri" && config && (
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

                    {gameType === "judgement" && judgementPreview && (
                        <div className="game-info-row">
                            <span>max {judgementPreview.maxPossible} cards/player</span>
                            <span className="game-info-dot">&middot;</span>
                            <span>{judgementPreview.totalRounds} rounds</span>
                            <span className="game-info-dot">&middot;</span>
                            <span>sequence: {judgementPreview.roundSequence.join(", ")}</span>
                        </div>
                    )}

                    {/* Bid Threshold (odd player counts only) */}
                    {gameType === "kaliteri" && config?.isOdd && (
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
                    {gameType === "kaliteri" && (
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
                    )}

                    {/* Bidding Window */}
                    {gameType === "kaliteri" && (
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
                    )}

                    {/* Card Inspect Time */}
                    {gameType === "kaliteri" && (
                    <div className="form-group">
                        <label>Card Inspect Time</label>
                        <div className="game-count-widget">
                            <button
                                className="bid-adjust"
                                onClick={() => adjustInspectTime(-5)}
                                disabled={inspectTime <= 5}
                            >
                                &minus;
                            </button>
                            <span className="threshold-value">{inspectTime}s</span>
                            <button
                                className="bid-adjust"
                                onClick={() => adjustInspectTime(5)}
                                disabled={inspectTime >= 30}
                            >
                                +
                            </button>
                        </div>
                        <div className="game-count-info">
                            How long players can view their cards before bidding opens (5&ndash;30s)
                        </div>
                    </div>
                    )}

                    {gameType === "judgement" && (
                        <>
                            <div className="form-group">
                                <label>Max Cards Per Round</label>
                                <div className="game-count-widget">
                                    <button
                                        className="bid-adjust"
                                        onClick={() => adjustMaxCards(-1)}
                                        disabled={maxCardsPerRound <= 1}
                                    >
                                        &minus;
                                    </button>
                                    <span className="threshold-value">{maxCardsPerRound}</span>
                                    <button
                                        className="bid-adjust"
                                        onClick={() => adjustMaxCards(1)}
                                        disabled={maxCardsPerRound >= judgementPreview.maxPossible}
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="game-count-info">
                                    Controls highest cards dealt in any round
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Round Order</label>
                                <div className="deck-toggle">
                                    <button
                                        className={`deck-btn ${!reverseOrder ? "active" : ""}`}
                                        onClick={() => setReverseOrder(false)}
                                    >
                                        Ascending Only
                                    </button>
                                    <button
                                        className={`deck-btn ${reverseOrder ? "active" : ""}`}
                                        onClick={() => setReverseOrder(true)}
                                    >
                                        Up & Down
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

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
