import { useEffect, useState, useRef, useCallback } from "react";
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
import DealRevealOverlay from "./DealRevealOverlay";
import { CircularTable, PlayArea } from "../shared";
import { getCardComponent, cardKey, suitSymbol, isRedSuit } from "./utils/cardMapper";
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
    const [showDealReveal, setShowDealReveal] = useState(false);
    // Minor 4: dealing animation counter
    const [dealingVisibleCount, setDealingVisibleCount] = useState(0);
    const prevPhaseRef = useRef(null);
    // Stable key so the overlay remounts fresh for each deal
    const dealRevealKeyRef = useRef(0);
    const dealingAnimRef = useRef(null);

    useEffect(() => {
        WsRequestGameState();
    }, []);

    // Trigger deal reveal when dealing phase completes → bidding begins
    useEffect(() => {
        const prev = prevPhaseRef.current;
        const curr = game.phase;
        if (prev === "dealing" && curr === "bidding") {
            dealRevealKeyRef.current += 1;
            setShowDealReveal(true);
        }
        prevPhaseRef.current = curr;
    }, [game.phase]);

    const handleRevealComplete = useCallback(() => setShowDealReveal(false), []);

    // Minor 4: animate dealingVisibleCount from 0 → myHand.length during dealing phase
    useEffect(() => {
        if (dealingAnimRef.current) {
            clearInterval(dealingAnimRef.current);
            dealingAnimRef.current = null;
        }

        if (game.phase !== "dealing" || game.myHand.length === 0) {
            setDealingVisibleCount(0);
            return;
        }

        const total = game.myHand.length;
        let count = 0;
        setDealingVisibleCount(0);

        dealingAnimRef.current = setInterval(() => {
            count++;
            setDealingVisibleCount(count);
            if (count >= total) {
                clearInterval(dealingAnimRef.current);
                dealingAnimRef.current = null;
            }
        }, 200); // 200 ms per card

        return () => {
            if (dealingAnimRef.current) {
                clearInterval(dealingAnimRef.current);
                dealingAnimRef.current = null;
            }
        };
    }, [game.phase, game.myHand.length]);

    // Reset inspect mode when trick clears
    const playsCount = game.currentTrick?.plays?.length || 0;
    useEffect(() => {
        if (playsCount === 0) setInspectMode(false);
    }, [playsCount]);

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
            case "powerhouse":
                return pid === game.leader;
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
                // Show hand sizes as they arrive from server during dealing
                return game.handSizes?.[pid] ?? 0;
            case "bidding":
            case "powerhouse":
                return total;
            case "playing":
                return computeCardCount(pid);
            default:
                return 0;
        }
    };

    const getTeamClass = (pid) => {
        if (["shuffling", "dealing", "bidding", "powerhouse"].includes(game.phase)) return "";
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

    // Minor 6: teammate/opponent relation — shown once all partners are revealed
    const allPartnersRevealed =
        (game.partnerCards?.length ?? 0) > 0 &&
        game.partnerCards.every((pc) => pc.revealed);

    const myTeam = game.teams?.bid?.includes(userId)
        ? "bid"
        : game.teams?.oppose?.includes(userId)
        ? "oppose"
        : null;

    const getRelation = (pid) => {
        if (!allPartnersRevealed || !myTeam || pid === userId) return null;
        const pidOnBid = (game.teams?.bid || []).includes(pid);
        const pidTeam = pidOnBid ? "bid" : "oppose";
        return pidTeam === myTeam ? "teammate" : "opponent";
    };

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
            relation: getRelation(pid), // "teammate" | "opponent" | null
        }));
    };

    const isTablePhase = ["shuffling", "dealing", "bidding", "powerhouse", "playing"].includes(game.phase);
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
            const dealerIndex = (game.seatOrder || []).indexOf(game.dealer);
            return (
                <DealingOverlay
                    isTableCenter
                    myHand={game.myHand}
                    cutCard={game.cutCard}
                    dealingConfig={game.dealingConfig}
                    isDealer={game.dealer === userId}
                    visibleCount={dealingVisibleCount}
                    seatOrder={game.seatOrder || []}
                    dealerIndex={dealerIndex >= 0 ? dealerIndex : 0}
                    userId={userId}
                    seatPositionMap={seatPositionMap}
                    tableSize={tableSize}
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
        if (game.phase === "powerhouse") {
            // Sub-phase 1: suit selection
            if (!game.powerHouseSuit) {
                if (isBidLeader) {
                    return (
                        <PowerHouseSelector
                            isTableCenter
                            powerHouseSuit={game.powerHouseSuit}
                            partnerCards={game.partnerCards}
                            myHand={game.myHand}
                            configKey={game.configKey}
                            partnerCardCount={game.partnerCardCount}
                        />
                    );
                }
                return (
                    <div className="powerhouse-waiting-center">
                        <div className="waiting-label">Selecting PowerHouse...</div>
                        <div className="waiting-name">{getName(game.leader)}</div>
                    </div>
                );
            }
            // Sub-phase 2: partner selection — center shows suit + status
            const phSuit = game.powerHouseSuit;
            return (
                <div className="powerhouse-waiting-center">
                    <div className={`waiting-suit-symbol ${isRedSuit(phSuit) ? "red" : "black"}`}>
                        {suitSymbol(phSuit)}
                    </div>
                    <div className="waiting-label">
                        {isBidLeader ? "Select Partners" : "Selecting Partners..."}
                    </div>
                    {!isBidLeader && (
                        <div className="waiting-name">{getName(game.leader)}</div>
                    )}
                </div>
            );
        }
        // Playing phase — with powersuit watermark
        return (
            <>
                {game.powerHouseSuit && (
                    <div className={`powersuit-watermark ${isRedSuit(game.powerHouseSuit) ? "red" : "black"}`}>
                        {suitSymbol(game.powerHouseSuit)}
                    </div>
                )}
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
            </>
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

            {/* Table phases: CircularTable with phase-specific center content */}
            {isTablePhase && (
                <>
                    {/* Minor 1: TeamScoreHUD (with scoreboard button) shows during ALL table phases */}
                    <TeamScoreHUD
                        tricks={game.tricks}
                        teams={game.teams}
                        leader={game.leader}
                        partnerCards={game.partnerCards}
                        phase={game.phase}
                    />

                    {isPlayingPhase && (
                        <PartnerCardDisplay
                            partnerCards={game.partnerCards}
                            powerHouseSuit={game.powerHouseSuit}
                            getName={getName}
                        />
                    )}

                    {/* Minor 3: "Your turn" pulse strip for local player */}
                    {isMyTurn && (
                        <div className="my-turn-indicator">
                            <span className="my-turn-dot" />
                            Your turn
                        </div>
                    )}

                    <div className="circular-table-container">
                        <CircularTable
                            players={buildPlayerList()}
                            centerContent={renderCenterContent}
                        />

                        {/* Partner picker overlay — covers CircularTable during partner selection */}
                        {game.phase === "powerhouse" && game.powerHouseSuit && isBidLeader && (
                            <div className="partner-picker-overlay">
                                <PowerHouseSelector
                                    isOverlay
                                    powerHouseSuit={game.powerHouseSuit}
                                    partnerCards={game.partnerCards}
                                    myHand={game.myHand}
                                    configKey={game.configKey}
                                    partnerCardCount={game.partnerCardCount}
                                />
                            </div>
                        )}
                    </div>
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

            {/* Player hand — hidden during shuffling/dealing and while reveal overlay is active */}
            {game.phase !== "finished" &&
             game.phase !== "series-finished" &&
             game.phase !== "shuffling" &&
             game.phase !== "dealing" &&
             !showDealReveal && (
                <PlayerHand
                    cards={game.myHand}
                    validPlays={game.validPlays}
                    isMyTurn={isMyTurn && game.phase === "playing"}
                />
            )}

            {/* Bidding controls below the hand */}
            {game.phase === "bidding" && !showDealReveal && (
                <BiddingPanel
                    bidding={game.bidding}
                    userId={userId}
                    isMyTurn={isMyTurn}
                    getName={getName}
                />
            )}

            {/* Click-to-reveal overlay: triggers after dealing phase completes */}
            {showDealReveal && game.myHand.length > 0 && (
                <DealRevealOverlay
                    key={dealRevealKeyRef.current}
                    cards={game.myHand}
                    onComplete={handleRevealComplete}
                />
            )}
        </div>
    );
};

export default GameBoard;
