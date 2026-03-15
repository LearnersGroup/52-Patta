import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { WsRequestGameState, WsQuitGame } from "../../api/wsEmitters";
import BiddingPanel from "./BiddingPanel";
import BidCenterDisplay from "./BidCenterDisplay";
import PowerHouseSelector from "./PowerHouseSelector";
import PlayerHand from "./PlayerHand";
import PlayerList from "./PlayerList";
import ScoreBoard from "./ScoreBoard";
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
    // Teammate reveal announcement
    const [revealAnnouncement, setRevealAnnouncement] = useState(null); // { playerName, bidderName }
    const prevRevealedPartnersRef = useRef([]);
    const revealAnnouncementTimerRef = useRef(null);

    useEffect(() => {
        WsRequestGameState();
    }, []);

    // Trigger deal reveal when dealing phase completes → bidding begins.
    // Auto-close the overlay when the reveal window expires (biddingWindowOpensAt).
    useEffect(() => {
        const prev = prevPhaseRef.current;
        const curr = game.phase;
        if (prev === "dealing" && curr === "bidding") {
            dealRevealKeyRef.current += 1;
            setShowDealReveal(true);

            // Auto-close when the reveal window ends (server timestamp)
            const opensAt = game.bidding?.biddingWindowOpensAt;
            const delayMs = opensAt ? Math.max(0, opensAt - Date.now()) : 7500;
            setTimeout(() => setShowDealReveal(false), delayMs);
        }
        prevPhaseRef.current = curr;
    }, [game.phase]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Detect newly revealed teammates and show a 2-second announcement.
    // Compare by LENGTH so a player who reveals twice (holds both teammate
    // cards) still triggers the second announcement correctly.
    useEffect(() => {
        const curr = game.revealedPartners || [];
        const prev = prevRevealedPartnersRef.current;

        if (curr.length > prev.length) {
            // The newly appended reveal is always the last element
            const newPartnerId = curr[curr.length - 1];
            const playerNames = game.playerNames || {};
            const resolveName = (pid) => playerNames[pid] || pid?.substring(0, 8);

            if (revealAnnouncementTimerRef.current) {
                clearTimeout(revealAnnouncementTimerRef.current);
            }
            setRevealAnnouncement({
                playerName: resolveName(newPartnerId),
                bidderName: resolveName(game.leader),
            });
            revealAnnouncementTimerRef.current = setTimeout(
                () => setRevealAnnouncement(null),
                2000
            );
        }
        // Store a snapshot so length comparisons survive re-renders
        prevRevealedPartnersRef.current = [...curr];
    }, [game.revealedPartners]); // eslint-disable-line

    // Cleanup timer on unmount
    useEffect(() => () => {
        if (revealAnnouncementTimerRef.current) clearTimeout(revealAnnouncementTimerRef.current);
    }, []);

    // ── Partner / relation logic ───────────────────────────────────────────
    // These must all live ABOVE any early return (Rules of Hooks).

    const allPartnersRevealed =
        (game.partnerCards?.length ?? 0) > 0 &&
        game.partnerCards.every((pc) => pc.revealed);

    // Server-confirmed team membership (public info as reveals happen)
    const myTeam = game.teams?.bid?.includes(userId)
        ? "bid"
        : game.teams?.oppose?.includes(userId)
        ? "oppose"
        : null;

    // Private hand-based inference (only the local user sees this).
    // Groups partner cards by {suit, rank} and uses whichCopy to determine
    // how many copies are actually available to non-leader players.
    //   whichCopy === null   → leader holds 1 copy, only 1 copy available
    //   whichCopy !== null   → leader holds 0 copies, 2 copies available
    const myKnownRelation = useMemo(() => {
        const partnerCards = game.partnerCards;
        if (!partnerCards?.length || !game.myHand?.length) return null;
        if (!["powerhouse", "playing"].includes(game.phase)) return null;
        // Only skip inference when server has confirmed us on the bid team
        // (after our partner card was revealed). "oppose" is the default for
        // ALL non-leaders, so we still need to infer when myTeam === "oppose".
        if (myTeam === "bid") return null;
        // When all partners are revealed, server data is fully authoritative — skip inference
        if (allPartnersRevealed) return null;

        const is2Deck = game.configKey?.includes("2D");

        if (!is2Deck) {
            // 1-deck: if I hold any UNREVEALED partner card slot → certain teammate.
            // Skip revealed slots — those are already filled by the revealed player.
            for (const pc of partnerCards) {
                if (!pc.card || pc.revealed) continue;
                const inHand = game.myHand.some(
                    (c) => c.suit === pc.card.suit && c.rank === pc.card.rank
                );
                if (inHand) return "certain-teammate";
            }
            return "certain-not-teammate";
        }

        // 2-deck: group UNREVEALED partner card slots by {suit, rank}.
        // Revealed slots are already filled — the remaining copy in my hand
        // is just a regular card, not a partner card.
        const groups = {};
        for (const pc of partnerCards) {
            if (!pc.card || pc.revealed) continue;
            const key = `${pc.card.suit}_${pc.card.rank}`;
            if (!groups[key]) {
                groups[key] = {
                    suit: pc.card.suit,
                    rank: pc.card.rank,
                    slots: 0,              // how many OPEN partner slots for this card
                    leaderHoldsOne: false,  // true if leader holds a copy (whichCopy === null)
                };
            }
            groups[key].slots += 1;
            if (pc.whichCopy === null) groups[key].leaderHoldsOne = true;
        }

        let hasCertain = false;
        let hasPotential = false;

        for (const g of Object.values(groups)) {
            const myCount = game.myHand.filter(
                (c) => c.suit === g.suit && c.rank === g.rank
            ).length;
            if (myCount === 0) continue;

            // Copies available to non-leader players (1 if leader holds one, else 2)
            const copiesAvailable = g.leaderHoldsOne ? 1 : 2;
            // Non-partner copies among available
            const nonPartnerCopies = copiesAvailable - g.slots;

            if (myCount > nonPartnerCopies) {
                // I must hold at least one partner copy
                hasCertain = true;
                break;
            } else {
                // My copies could all be non-partner copies
                hasPotential = true;
            }
        }

        return hasCertain ? "certain-teammate" : hasPotential ? "potential-teammate" : "certain-not-teammate";
    }, [game.partnerCards, game.myHand, game.configKey, game.phase, myTeam, allPartnersRevealed]); // eslint-disable-line

    // Effective team: private inference overrides the server's default "oppose"
    // assignment (all non-leaders start on oppose until partner card reveal).
    // Only server-confirmed "bid" (after reveal) takes absolute priority.
    const myEffectiveTeam =
        allPartnersRevealed                               ? myTeam   :  // all revealed → server is fully authoritative
        myTeam === "bid"                                  ? "bid"    :  // server confirmed (partner revealed)
        myKnownRelation === "certain-teammate"            ? "bid"    :  // I definitely hold a partner card
        myKnownRelation === "certain-not-teammate"        ? "oppose" :  // I definitely don't
        myKnownRelation === "potential-teammate"          ? null     :  // maybe — can't commit either way
        myTeam;                                                         // fall back to server (null or "oppose")

    // ── Early return (after all hooks) ────────────────────────────────────

    if (!game.phase) {
        return <div className="game-board-loading">Loading game state...</div>;
    }

    const playerNames = game.playerNames || {};
    const playerAvatars = game.playerAvatars || {};
    const getName = (pid) => playerNames[pid] || pid?.substring(0, 8);
    const isBidLeader = game.leader === userId;
    const isMyTurn =
        game.phase === "bidding"
            // Open bidding: any non-passed active player "has a turn"
            ? !game.bidding?.passed?.includes(userId)
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

    // ── Relation resolver (per opponent seat) ─────────────────────────────
    // Returns "teammate" | "opponent" | "potential-teammate" | null
    const getRelation = (pid) => {
        if (pid === userId) return null;

        const pidIsLeader          = pid === game.leader;
        const pidIsRevealedPartner = (game.revealedPartners || []).includes(pid);
        const pidOnBid             = (game.teams?.bid || []).includes(pid);
        const partnerCardsChosen   = (game.partnerCards?.length ?? 0) > 0;

        // ── Bidder (leader) seat ─────────────────────────────────────────
        // Relation only appears after partner cards are selected (not during
        // powerhouse suit/card picking).
        if (pidIsLeader) {
            let leaderResult = null;
            if (!partnerCardsChosen) leaderResult = null;
            else if (myEffectiveTeam === "bid") leaderResult = "teammate";
            else if (myKnownRelation === "potential-teammate") leaderResult = "potential-teammate";
            else if (myEffectiveTeam === "oppose") leaderResult = "opponent";
            return leaderResult;
        }

        // ── All other seats: only visible once publicly revealed ──────────
        const pidTeamPublic = pidIsRevealedPartner || allPartnersRevealed;
        if (!pidTeamPublic) return null;

        const pidTeam = pidOnBid ? "bid" : "oppose";

        if (myEffectiveTeam) {
            return pidTeam === myEffectiveTeam ? "teammate" : "opponent";
        }

        // myEffectiveTeam is null → I'm a potential-teammate and don't yet know
        // which side I'll end up on. A revealed bid-team member (e.g. P2) is
        // therefore only a *potential* teammate from my perspective — they could
        // be my teammate or my opponent depending on whether I turn out to be
        // on the bid team or not.
        if (myKnownRelation === "potential-teammate" && pidTeam === "bid") {
            return "potential-teammate";
        }

        return null;
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
            avatar: playerAvatars[pid] || "",
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
                        {isBidLeader ? "Select Teammates" : "Selecting Teammates..."}
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
                    playerAvatars={playerAvatars}
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
                        removedTwos={game.removedTwos || []}
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

                    {/* Teammate reveal announcement — 2-second toast */}
                    {revealAnnouncement && (
                        <div className="reveal-announcement" key={revealAnnouncement.playerName}>
                            <span className="reveal-announcement-player">{revealAnnouncement.playerName}</span>
                            {" is "}
                            <span className="reveal-announcement-bidder">{revealAnnouncement.bidderName}</span>
                            {"'s teammate!"}
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
