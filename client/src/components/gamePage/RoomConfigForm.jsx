import { useEffect, useMemo, useRef } from "react";

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
    const bidMax = D === 1 ? 250 : 500;
    const isOdd = N % 2 === 1;
    const bidTeamDefault = Math.floor(N / 2);
    const opposeTeamDefault = Math.ceil(N / 2);
    const partnerCards = bidTeamDefault - 1;
    const bidThresholdDefault = isOdd
        ? Math.round(((bidStart + bidMax) / 2) / 5) * 5
        : null;

    return {
        totalCards,
        cardsPerPlayer,
        rounds: cardsPerPlayer,
        bidStart,
        bidMax,
        isOdd,
        bidTeamDefault,
        opposeTeamDefault,
        partnerCards,
        bidThresholdDefault,
        defaultTeams: `${bidTeamDefault} vs ${opposeTeamDefault}`,
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

const RoomConfigForm = ({
    gameType,
    setGameType,
    playerCount,
    setPlayerCount,
    deckCount,
    setDeckCount,
    bidThreshold,
    setBidThreshold,
    gameCount,
    setGameCount,
    bidWindow,
    setBidWindow,
    inspectTime,
    setInspectTime,
    maxCardsPerRound,
    setMaxCardsPerRound,
    reverseOrder,
    setReverseOrder,
    trumpMode,
    setTrumpMode,
    scoreboardTime,
    setScoreboardTime,
    bidTimeEnabled,
    setBidTimeEnabled,
    bidTime,
    setBidTime,
    cardRevealTime,
    setCardRevealTime,
    minPlayerCount,
    showRoomName,
    roomName,
}) => {
    const defaultMinPlayers = gameType === "judgement" ? 3 : 4;
    const effectiveMinPlayers = Math.max(defaultMinPlayers, minPlayerCount ?? defaultMinPlayers);

    const config = useMemo(() => computeClientConfig(playerCount, deckCount), [playerCount, deckCount]);
    const oneDeckOk = useMemo(() => isDeckCountValid(playerCount, 1), [playerCount]);
    const judgementPreview = useMemo(
        () => computeJudgementPreview(playerCount, deckCount, maxCardsPerRound, reverseOrder),
        [playerCount, deckCount, maxCardsPerRound, reverseOrder]
    );

    const isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
    }, []);

    useEffect(() => {
        if (playerCount < effectiveMinPlayers) {
            setPlayerCount(effectiveMinPlayers);
        }
    }, [effectiveMinPlayers, playerCount, setPlayerCount]);

    useEffect(() => {
        if (gameType === "judgement") {
            if (playerCount <= 6 && deckCount !== 1) setDeckCount(1);
            if (playerCount >= 7 && deckCount !== 2) setDeckCount(2);
            return;
        }

        if (!isDeckCountValid(playerCount, deckCount)) {
            setDeckCount(2);
        }
    }, [playerCount, gameType, deckCount, setDeckCount]);

    useEffect(() => {
        if (!isMounted.current) return;
        if (gameType !== "kaliteri") return;
        const cfg = computeClientConfig(playerCount, deckCount);
        if (cfg?.isOdd) {
            setBidThreshold(cfg.bidThresholdDefault);
        } else {
            setBidThreshold(null);
        }
    }, [playerCount, deckCount, gameType, setBidThreshold]);

    useEffect(() => {
        if (gameType !== "judgement") return;
        setBidThreshold(null);
        setGameCount(playerCount);
        setBidWindow(15);
        setInspectTime(15);
        setMaxCardsPerRound((prev) => {
            const maxPossible = Math.floor((52 * deckCount) / playerCount);
            const target = Math.min(7, maxPossible);
            if (!prev || prev < 1 || prev > maxPossible) return target;
            return prev;
        });
    }, [
        gameType,
        playerCount,
        deckCount,
        setBidThreshold,
        setGameCount,
        setBidWindow,
        setInspectTime,
        setMaxCardsPerRound,
    ]);

    const adjustPlayerCount = (delta) => {
        const next = Math.max(effectiveMinPlayers, Math.min(13, playerCount + delta));
        setPlayerCount(next);
        setGameCount(next);
    };

    const adjustGameCount = (delta) => setGameCount((prev) => Math.max(1, Math.min(20, prev + delta)));
    const adjustBidWindow = (delta) => setBidWindow((prev) => Math.max(5, Math.min(60, prev + delta)));
    const adjustInspectTime = (delta) => setInspectTime((prev) => Math.max(5, Math.min(30, prev + delta)));

    const adjustThreshold = (delta) => {
        if (!config?.isOdd) return;
        const step = 5;
        const min = config.bidStart + step;
        const max = config.bidMax;
        setBidThreshold((prev) => {
            const next = (prev ?? config.bidThresholdDefault) + delta;
            return Math.max(min, Math.min(max, next));
        });
    };

    const adjustMaxCards = (delta) => {
        const maxPossible = Math.floor((52 * deckCount) / playerCount);
        setMaxCardsPerRound((prev) => Math.max(1, Math.min(maxPossible, prev + delta)));
    };

    const adjustScoreboardTime = (delta) => setScoreboardTime((prev) => Math.max(3, Math.min(30, prev + delta)));
    const adjustBidTime = (delta) => setBidTime((prev) => Math.max(5, Math.min(60, prev + delta)));
    const adjustCardRevealTime = (delta) => setCardRevealTime((prev) => Math.max(3, Math.min(30, prev + delta)));

    const thresholdValue = bidThreshold ?? config?.bidThresholdDefault ?? 200;

    return (
        <div className="create-form">
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

            {showRoomName && (
                <div className="form-group">
                    <label>Room Name</label>
                    <div className="room-name-display">{roomName}</div>
                </div>
            )}

            <div className="form-group">
                <label>Players</label>
                <div className="game-count-widget">
                    <button
                        className="bid-adjust"
                        onClick={() => adjustPlayerCount(-1)}
                        disabled={playerCount <= effectiveMinPlayers}
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

                    <div className="form-group">
                        <label>Trump Mode</label>
                        <div className="deck-toggle">
                            <button
                                className={`deck-btn ${trumpMode === "random" ? "active" : ""}`}
                                onClick={() => setTrumpMode("random")}
                            >
                                Random
                            </button>
                            <button
                                className={`deck-btn ${trumpMode === "fixed" ? "active" : ""}`}
                                onClick={() => setTrumpMode("fixed")}
                            >
                                Fixed (S→D→C→H)
                            </button>
                        </div>
                        {trumpMode === "fixed" && (
                            <div className="game-count-info">
                                Trump cycles: ♠ → ♦ → ♣ → ♥ → ♠ each round
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Scoreboard Display Time</label>
                        <div className="game-count-widget">
                            <button className="bid-adjust" onClick={() => adjustScoreboardTime(-1)} disabled={scoreboardTime <= 3}>&minus;</button>
                            <span className="threshold-value">{scoreboardTime}s</span>
                            <button className="bid-adjust" onClick={() => adjustScoreboardTime(1)} disabled={scoreboardTime >= 30}>+</button>
                        </div>
                        <div className="game-count-info">How long to show the scoreboard between rounds (3–30s)</div>
                    </div>

                    <div className="form-group">
                        <label>Bidding Time Limit</label>
                        <div className="deck-toggle">
                            <button className={`deck-btn ${!bidTimeEnabled ? "active" : ""}`} onClick={() => setBidTimeEnabled(false)}>
                                No Limit
                            </button>
                            <button className={`deck-btn ${bidTimeEnabled ? "active" : ""}`} onClick={() => setBidTimeEnabled(true)}>
                                Time Limit
                            </button>
                        </div>
                        {bidTimeEnabled && (
                            <div className="game-count-widget" style={{ marginTop: "8px" }}>
                                <button className="bid-adjust" onClick={() => adjustBidTime(-5)} disabled={bidTime <= 5}>&minus;</button>
                                <span className="threshold-value">{bidTime}s</span>
                                <button className="bid-adjust" onClick={() => adjustBidTime(5)} disabled={bidTime >= 60}>+</button>
                            </div>
                        )}
                        <div className="game-count-info">
                            {bidTimeEnabled ? `Each player has ${bidTime}s to bid` : "Players take as long as they need"}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Card Reveal Time</label>
                        <div className="game-count-widget">
                            <button className="bid-adjust" onClick={() => adjustCardRevealTime(-1)} disabled={cardRevealTime <= 3}>&minus;</button>
                            <span className="threshold-value">{cardRevealTime}s</span>
                            <button className="bid-adjust" onClick={() => adjustCardRevealTime(1)} disabled={cardRevealTime >= 30}>+</button>
                        </div>
                        <div className="game-count-info">Time to reveal your cards after dealing (3–30s)</div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RoomConfigForm;
