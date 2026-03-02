import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { WsRequestGameState, WsQuitGame } from "../../api/wsEmitters";
import BiddingPanel from "./BiddingPanel";
import BidCenterDisplay from "./BidCenterDisplay";
import PowerHouseSelector from "./PowerHouseSelector";
import PlayerHand from "./PlayerHand";
import PlayerList from "./PlayerList";
import ScoreBoard from "./ScoreBoard";
import RemovedTwosDisplay from "./RemovedTwosDisplay";
import PartnerCardDisplay from "./PartnerCardDisplay";
import TeamScoreHUD from "./TeamScoreHUD";
import { CircularTable, PlayArea } from "../shared";
import { getCardComponent, cardKey } from "./utils/cardMapper";
import ShufflingPanel from "./ShufflingPanel";
import DealingOverlay from "./DealingOverlay";
import SeriesFinishedPanel from "./SeriesFinishedPanel";

// Cards per player for each game config (mirrors server config.js)
const CARDS_PER_PLAYER = {
    "4P1D": 13, "5P1D": 10, "6P1D": 8, "6P2D": 17,
    "7P2D": 14, "8P2D": 13, "9P2D": 11, "10P2D": 10,
};

const GameBoard = ({ userId, isAdmin }) => {
    const game = useSelector((state) => state.game);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [inspectMode, setInspectMode] = useState(false);
    const [dealingVisibleCount, setDealingVisibleCount] = useState(0);

    useEffect(() => {
        WsRequestGameState();
    }, []);

    // Reset inspect mode when trick clears
    const playsCount = game.currentTrick?.plays?.length || 0;
    useEffect(() => {
        if (playsCount === 0) setInspectMode(false);
    }, [playsCount]);

    // Dealing card reveal timer — reveals cards one-by-one
    useEffect(() => {
        if (game.phase !== "dealing" || !game.myHand?.length) {
            setDealingVisibleCount(0);
            return;
        }

        const animDuration = game.dealingConfig?.animationDurationMs || 5000;
        const isDealerUser = game.dealer === userId;
        const cutRevealMs = game.dealingConfig?.cutCardRevealMs || 1500;
        const delay = (game.cutCard && isDealerUser) ? cutRevealMs : 0;
        const interval = animDuration / game.myHand.length;
        let intervalId = null;

        const startTimerId = setTimeout(() => {
            let count = 0;
            intervalId = setInterval(() => {
                count++;
                setDealingVisibleCount(count);
                if (count >= game.myHand.length) {
                    clearInterval(intervalId);
                }
            }, interval);
        }, delay);

        return () => {
            clearTimeout(startTimerId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [game.phase, game.myHand?.length, game.dealingConfig, game.cutCard, game.dealer, userId]);

    if (!game.phase) {
        return <div className="game-board-loading">Loading game state...</div>;
    }

    const playerNames = game.playerNames || {};
    const getName = (pid) => playerNames[pid] || pid?.substring(0, 8);
    const isBidLeader = game.leader === userId;
    const isMyTurn =
        game.phase === "bidding"
            ? game.bidding?.currentTurn === userId
            : game.phase === "playing"
            ? game.currentTrick?.currentTurn === userId
            : false;

    const handleQuitGame = () => {
        WsQuitGame();
        setShowQuitConfirm(false);
    };

    // --- Phase-aware helpers for CircularTable ---

    const computeCardCount = (pid) => {
        const total = CARDS_PER_PLAYER[game.configKey] || 13;
        const trickPlays = game.currentTrick?.plays || [];
        const hasPlayed = trickPlays.some((p) => p.playerId === pid);
        return Math.max(0, total - (game.currentRound || 0) - (hasPlayed ? 1 : 0));
    };

    const getIsTurn = (pid) => {
        switch (game.phase) {
            case "shuffling":
            case "dealing":
                return pid === game.dealer;
            case "bidding":
                return pid === game.bidding?.currentTurn;
            case "playing":
                return pid === game.currentTrick?.currentTurn;
            default:
                return false;
        }
    };

    const getCardCount = (pid) => {
        const total = CARDS_PER_PLAYER[game.configKey] || 13;
        switch (game.phase) {
            case "shuffling":
                return 0;
            case "dealing":
                if (pid === userId) return dealingVisibleCount;
                return game.handSizes?.[pid] ?? 0;
            case "bidding":
                return total;
            case "playing":
                return computeCardCount(pid);
            default:
                return 0;
        }
    };

    const getTeamClass = (pid) => {
        if (["shuffling", "dealing", "bidding"].includes(game.phase)) return "";
        const isBidTeam = game.teams?.bid?.includes(pid);
        const isOppose = game.teams?.oppose?.includes(pid);
        if (isBidTeam) return "team-bid";
        if (isOppose && game.leader) return "team-oppose";
        return "";
    };

    const playerTrickPoints = {};
    (game.tricks || []).forEach((t) => {
        if (t.winner) {
            playerTrickPoints[t.winner] =
                (playerTrickPoints[t.winner] || 0) + (t.points || 0);
        }
    });

    const buildPlayerList = () => {
        return (game.seatOrder || []).map((pid) => ({
            id: pid,
            name: getName(pid),
            isMe: pid === userId,
            isLeader: pid === game.leader,
            isDealer: pid === game.dealer,
            isPartner: game.revealedPartners?.includes(pid),
            isTurn: getIsTurn(pid),
            teamClass: getTeamClass(pid),
            cardCount: getCardCount(pid),
            score: playerTrickPoints[pid] ?? 0,
            avatarInitial: getName(pid).charAt(0).toUpperCase(),
        }));
    };

    const isTablePhase = ["shuffling", "dealing", "bidding", "playing"].includes(game.phase);
    const isPlayingPhase = game.phase === "playing";

    // Center content for CircularTable based on phase
    const renderCenterContent = ({ seatPositionMap, tableSize }) => {
        if (game.phase === "shuffling") {
            return (
                <ShufflingPanel
                    isTableCenter
                    dealer={game.dealer}
                    userId={userId}
                    shuffleQueue={game.shuffleQueue}
                    getName={getName}
                    currentGameNumber={game.currentGameNumber}
                    totalGames={game.totalGames}
                />
            );
        }
        if (game.phase === "dealing") {
            return (
                <DealingOverlay
                    isTableCenter
                    myHand={game.myHand}
                    cutCard={game.cutCard}
                    dealingConfig={game.dealingConfig}
                    isDealer={game.dealer === userId}
                    visibleCount={dealingVisibleCount}
                />
            );
        }
        if (game.phase === "bidding") {
            return (
                <BidCenterDisplay
                    bidding={game.bidding}
                    getName={getName}
                />
            );
        }
        // Playing phase
        return (
            <PlayArea
                plays={game.currentTrick?.plays || []}
                inspectMode={inspectMode}
                onToggleInspect={() => setInspectMode(!inspectMode)}
                getCardSvg={getCardComponent}
                cardKeyFn={cardKey}
                getName={getName}
                seatPositionMap={seatPositionMap}
                tableSize={tableSize}
                roundLabel={`Round ${(game.currentRound || 0) + 1}`}
                seatOrder={game.seatOrder}
                tricksCount={game.tricks?.length || 0}
                lastTrickWinner={
                    game.tricks?.length > 0
                        ? game.tricks[game.tricks.length - 1].winner
                        : null
                }
                lastTrickCards={
                    game.tricks?.length > 0
                        ? game.tricks[game.tricks.length - 1].cards
                        : null
                }
            />
        );
    };

    return (
        <div className="game-board">
            {isAdmin && (
                <div className="quit-game-bar">
                    <button className="btn-danger btn-sm" onClick={() => setShowQuitConfirm(true)}>
                        Quit Game
                    </button>
                </div>
            )}

            {showQuitConfirm && (
                <div className="quit-confirm-overlay">
                    <div className="quit-confirm-dialog">
                        <h3>Quit Game?</h3>
                        <p>This will end the current game and return all players to the lobby.</p>
                        <div className="quit-confirm-actions">
                            <button className="btn-secondary" onClick={() => setShowQuitConfirm(false)}>Cancel</button>
                            <button className="btn-danger" onClick={handleQuitGame}>Quit Game</button>
                        </div>
                    </div>
                </div>
            )}

            {game.error && <div className="game-error-banner">{game.error}</div>}

            {game.removedTwos?.length > 0 && <RemovedTwosDisplay cards={game.removedTwos} />}

            {/* Non-table phases: use horizontal player list */}
            {!isTablePhase && (
                <PlayerList
                    seatOrder={game.seatOrder}
                    handSizes={game.handSizes}
                    teams={game.teams}
                    revealedPartners={game.revealedPartners}
                    currentTurn={
                        game.phase === "bidding"
                            ? game.bidding?.currentTurn
                            : game.currentTrick?.currentTurn
                    }
                    leader={game.leader}
                    dealer={game.dealer}
                    userId={userId}
                    scores={game.scores}
                    getName={getName}
                />
            )}

            {game.phase === "powerhouse" && isBidLeader && (
                <PowerHouseSelector
                    powerHouseSuit={game.powerHouseSuit}
                    partnerCards={game.partnerCards}
                    myHand={game.myHand}
                    configKey={game.configKey}
                    partnerCardCount={game.partnerCardCount}
                />
            )}

            {game.phase === "powerhouse" && !isBidLeader && (
                <div className="waiting-panel">
                    <div className="waiting-text">
                        Waiting for the bid winner to select PowerHouse and partners...
                    </div>
                </div>
            )}

            {/* Table phases: CircularTable with phase-specific center content */}
            {isTablePhase && (
                <>
                    {isPlayingPhase && (
                        <>
                            <TeamScoreHUD
                                tricks={game.tricks}
                                teams={game.teams}
                                leader={game.leader}
                                partnerCards={game.partnerCards}
                            />

                            <PartnerCardDisplay
                                partnerCards={game.partnerCards}
                                powerHouseSuit={game.powerHouseSuit}
                                getName={getName}
                            />
                        </>
                    )}

                    <CircularTable
                        players={buildPlayerList()}
                        centerContent={renderCenterContent}
                    />
                </>
            )}

            {(game.phase === "scoring" || game.phase === "finished") && (
                <ScoreBoard
                    scores={game.scores}
                    teams={game.teams}
                    tricks={game.tricks}
                    phase={game.phase}
                    scoringResult={game.scoringResult}
                    seatOrder={game.seatOrder}
                    bidding={game.bidding}
                    getName={getName}
                    nextRoundReady={game.nextRoundReady}
                    userId={userId}
                    isAdmin={isAdmin}
                    onQuitGame={() => setShowQuitConfirm(true)}
                    currentGameNumber={game.currentGameNumber}
                    totalGames={game.totalGames}
                />
            )}

            {game.phase === "series-finished" && (
                <SeriesFinishedPanel
                    finalRankings={game.finalRankings}
                    scores={game.scores}
                    seatOrder={game.seatOrder}
                    getName={getName}
                    userId={userId}
                />
            )}

            {/* Player hand — progressive reveal during dealing */}
            {game.phase !== "finished" && game.phase !== "series-finished" && game.phase !== "shuffling" && (
                <PlayerHand
                    cards={
                        game.phase === "dealing"
                            ? (game.myHand || []).slice(0, dealingVisibleCount)
                            : game.myHand
                    }
                    validPlays={game.validPlays}
                    isMyTurn={isMyTurn && game.phase === "playing"}
                />
            )}

            {/* Bidding controls below the hand */}
            {game.phase === "bidding" && (
                <BiddingPanel
                    bidding={game.bidding}
                    userId={userId}
                    isMyTurn={isMyTurn}
                    getName={getName}
                />
            )}
        </div>
    );
};

export default GameBoard;
