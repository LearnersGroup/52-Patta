import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { WsRequestGameState, WsQuitGame } from "../../api/wsEmitters";
import BiddingPanel from "./BiddingPanel";
import PowerHouseSelector from "./PowerHouseSelector";
import PlayerHand from "./PlayerHand";
import TrickArea from "./TrickArea";
import PlayerList from "./PlayerList";
import ScoreBoard from "./ScoreBoard";
import RemovedTwosDisplay from "./RemovedTwosDisplay";

const GameBoard = ({ userId, isAdmin }) => {
    const game = useSelector((state) => state.game);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);

    useEffect(() => {
        // Request current game state on mount (listeners registered in GamePage)
        WsRequestGameState();
    }, []);

    if (!game.phase) {
        return (
            <div className="game-board-loading">
                Loading game state...
            </div>
        );
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

    return (
        <div className="game-board">
            {isAdmin && (
                <div className="quit-game-bar">
                    <button
                        className="btn-danger btn-sm"
                        onClick={() => setShowQuitConfirm(true)}
                    >
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
                            <button
                                className="btn-secondary"
                                onClick={() => setShowQuitConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-danger"
                                onClick={handleQuitGame}
                            >
                                Quit Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {game.error && (
                <div className="game-error-banner">{game.error}</div>
            )}

            {game.removedTwos?.length > 0 && (
                <RemovedTwosDisplay cards={game.removedTwos} />
            )}

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
                userId={userId}
                scores={game.scores}
                getName={getName}
            />

            {game.phase === "bidding" && (
                <BiddingPanel
                    bidding={game.bidding}
                    userId={userId}
                    isMyTurn={isMyTurn}
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

            {game.phase === "playing" && (
                <TrickArea
                    currentTrick={game.currentTrick}
                    seatOrder={game.seatOrder}
                    powerHouseSuit={game.powerHouseSuit}
                    currentRound={game.currentRound}
                    totalRounds={game.tricks?.length + 1}
                    getName={getName}
                />
            )}

            {(game.phase === "playing" || game.phase === "scoring" || game.phase === "finished") && (
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
                />
            )}

            {game.phase !== "finished" && (
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
