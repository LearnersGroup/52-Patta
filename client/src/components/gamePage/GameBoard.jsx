import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { WsRequestGameState, WsQuitGame } from "../../api/wsEmitters";
import BiddingPanel from "./BiddingPanel";
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

    useEffect(() => {
        WsRequestGameState();
    }, []);

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

    const computeCardCount = (pid) => {
        const total = CARDS_PER_PLAYER[game.configKey] || 13;
        const trickPlays = game.currentTrick?.plays || [];
        const hasPlayed = trickPlays.some((p) => p.playerId === pid);
        return Math.max(0, total - (game.currentRound || 0) - (hasPlayed ? 1 : 0));
    };

    const playerTrickPoints = {};
    (game.tricks || []).forEach((t) => {
        if (t.winner) {
            playerTrickPoints[t.winner] =
                (playerTrickPoints[t.winner] || 0) + (t.points || 0);
        }
    });

    const buildPlayerList = () => {
        return (game.seatOrder || []).map((pid) => {
            const isMe = pid === userId;
            const isLeader = pid === game.leader;
            const isDealer = pid === game.dealer;
            const isBidTeam = game.teams?.bid?.includes(pid);
            const isOppose = game.teams?.oppose?.includes(pid);
            const isRevealed = game.revealedPartners?.includes(pid);

            let teamClass = "";
            if (isBidTeam) teamClass = "team-bid";
            else if (isOppose && game.leader) teamClass = "team-oppose";

            return {
                id: pid,
                name: getName(pid),
                isMe,
                isLeader,
                isDealer,
                isPartner: isRevealed,
                isTurn: pid === game.currentTrick?.currentTurn,
                teamClass,
                cardCount: computeCardCount(pid),
                score: playerTrickPoints[pid] ?? 0,
                avatarInitial: getName(pid).charAt(0).toUpperCase(),
            };
        });
    };

    const isPlayingPhase = game.phase === "playing";

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

            {/* Non-playing phases: use horizontal player list */}
            {!isPlayingPhase && (
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

            {game.phase === "shuffling" && (
                <ShufflingPanel
                    dealer={game.dealer}
                    userId={userId}
                    shuffleQueue={game.shuffleQueue}
                    getName={getName}
                    currentGameNumber={game.currentGameNumber}
                    totalGames={game.totalGames}
                />
            )}

            {game.phase === "dealing" && (
                <DealingOverlay
                    myHand={game.myHand}
                    cutCard={game.cutCard}
                    dealingConfig={game.dealingConfig}
                    isDealer={game.dealer === userId}
                />
            )}

            {game.phase === "bidding" && (
                <BiddingPanel bidding={game.bidding} userId={userId} isMyTurn={isMyTurn} getName={getName} />
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

            {/* Playing phase: HUDs + Circular table with PlayArea */}
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

                    <CircularTable
                        players={buildPlayerList()}
                        centerContent={({ seatPositionMap, tableSize }) => (
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
                        )}
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

            {game.phase !== "finished" && game.phase !== "series-finished" && game.phase !== "shuffling" && (
                <PlayerHand
                    cards={game.myHand}
                    validPlays={game.validPlays}
                    isMyTurn={isMyTurn && game.phase === "playing"}
                />
            )}
        </div>
    );
};

export default GameBoard;
