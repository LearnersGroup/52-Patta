import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { WsRequestGameState, WsQuitGame, WsProceedToShuffle, WsReturnToLobby } from "../../api/wsEmitters";
import BidCenterDisplay from "./BidCenterDisplay";
import PowerHouseSelector from "./PowerHouseSelector";
import PlayerHand from "./PlayerHand";
import PlayerList from "./PlayerList";
import JudgementScoreboardModal from "./JudgementScoreboardModal";
import PartnerCardDisplay from "./PartnerCardDisplay";
import DealRevealOverlay from "./DealRevealOverlay";
import { CircularTable, PlayArea } from "../shared";
import { getCardComponent, cardKey, suitSymbol, isRedSuit } from "./utils/cardMapper";
import ShufflingPanel from "./ShufflingPanel";
import DealingOverlay from "./DealingOverlay";
import SeriesFinishedPanel from "./SeriesFinishedPanel";
import { getGameConfig } from "./gameRegistry";
import { clearGameState } from "../../api/wsGameListeners";

const GameBoard = ({ userId, isAdmin }) => {
    const gameType = useSelector((state) => state.game.game_type) || "kaliteri";
    const isJudgement = gameType === "judgement";
    const gameConfig = getGameConfig(gameType);
    const phase = useSelector((state) => state.game.phase);
    const configKey = useSelector((state) => state.game.configKey);
    const seatOrder = useSelector((state) => state.game.seatOrder);
    const playerNames = useSelector((state) => state.game.playerNames);
    const playerAvatars = useSelector((state) => state.game.playerAvatars);
    const removedTwos = useSelector((state) => state.game.removedTwos);
    const myHand = useSelector((state) => state.game.myHand);
    const validPlays = useSelector((state) => state.game.validPlays);
    const bidding = useSelector((state) => state.game.bidding);
    const leader = useSelector((state) => state.game.leader);
    const powerHouseSuit = useSelector((state) => state.game.powerHouseSuit);
    const partnerCards = useSelector((state) => state.game.partnerCards);
    const partnerCardCount = useSelector((state) => state.game.partnerCardCount);
    const teams = useSelector((state) => state.game.teams);
    const revealedPartners = useSelector((state) => state.game.revealedPartners);
    const currentRound = useSelector((state) => state.game.currentRound);
    const currentTrick = useSelector((state) => state.game.currentTrick);
    const tricks = useSelector((state) => state.game.tricks);
    const handSizes = useSelector((state) => state.game.handSizes);
    const scores = useSelector((state) => state.game.scores);
    const scoringResult = useSelector((state) => state.game.scoringResult);
    const nextRoundReady = useSelector((state) => state.game.nextRoundReady);
    const error = useSelector((state) => state.game.error);
    const dealer = useSelector((state) => state.game.dealer);
    const shuffleQueue = useSelector((state) => state.game.shuffleQueue);
    const dealingConfig = useSelector((state) => state.game.dealingConfig);
    const currentGameNumber = useSelector((state) => state.game.currentGameNumber);
    const totalGames = useSelector((state) => state.game.totalGames);
    const finalRankings = useSelector((state) => state.game.finalRankings);
    const trumpCard = useSelector((state) => state.game.trumpCard);
    const trumpSuit = useSelector((state) => state.game.trumpSuit);
    const tricksWon = useSelector((state) => state.game.tricksWon);
    const currentCardsPerRound = useSelector((state) => state.game.currentCardsPerRound);
    const seriesRoundIndex = useSelector((state) => state.game.seriesRoundIndex);
    const totalRoundsInSeries = useSelector((state) => state.game.totalRoundsInSeries);
    const roundResults = useSelector((state) => state.game.roundResults);
    const trumpMode = useSelector((state) => state.game.trumpMode);
    const scoreboardTimeMs = useSelector((state) => state.game.scoreboardTimeMs);
    const cardRevealTimeMs = useSelector((state) => state.game.cardRevealTimeMs);

    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [inspectMode, setInspectMode] = useState(false);
    const [showJdgScoreboard, setShowJdgScoreboard] = useState(false);
    const [showDealReveal, setShowDealReveal] = useState(false);
    // Judgement: delay scoreboard by 3s so the last trick animation plays out first
    const [scorecardVisible, setScorecardVisible] = useState(false);
    const scorecardTimerRef = useRef(null);
    // Minor 4: dealing animation counter
    const [dealingVisibleCount, setDealingVisibleCount] = useState(0);
    const prevPhaseRef = useRef(null);
    // Stable key so the overlay remounts fresh for each deal
    const dealRevealKeyRef = useRef(0);
    const dealingAnimRef = useRef(null);
    // Teammate reveal announcement
    const [revealAnnouncement, setRevealAnnouncement] = useState(null); // { playerName, bidderName }
    const [trumpCountdown, setTrumpCountdown] = useState(5);
    const trumpCountdownRef = useRef(null);
    const prevRevealedPartnersRef = useRef([]);
    const revealAnnouncementTimerRef = useRef(null);

    useEffect(() => {
        WsRequestGameState();
    }, []);

    // Trigger deal reveal when dealing phase completes → bidding begins.
    // Auto-close the overlay when the reveal window expires (biddingWindowOpensAt).
    useEffect(() => {
        const prev = prevPhaseRef.current;
        const curr = phase;
        if (prev === "dealing" && curr === "bidding") {
            dealRevealKeyRef.current += 1;
            setShowDealReveal(true);

            // Auto-close when the reveal window ends (server timestamp or fallback)
            const opensAt = bidding?.biddingWindowOpensAt;
            const fallbackMs = cardRevealTimeMs ?? gameConfig.dealRevealFallbackMs;
            const delayMs = opensAt ? Math.max(0, opensAt - Date.now()) : fallbackMs;
            setTimeout(() => setShowDealReveal(false), delayMs);
        }
        prevPhaseRef.current = curr;
    }, [phase, gameConfig, bidding, cardRevealTimeMs]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRevealComplete = useCallback(() => setShowDealReveal(false), []);

    // For Judgement: delay scoreboard by 3s after phase reaches "finished"
    // so the last-trick sweep animation plays out before the table disappears.
    // For Kaliteri: show immediately (Kaliteri has its own post-round flow).
    useEffect(() => {
        if (scorecardTimerRef.current) {
            clearTimeout(scorecardTimerRef.current);
            scorecardTimerRef.current = null;
        }

        const isFinished = phase === "scoring" || phase === "finished";

        if (isFinished && isJudgement) {
            scorecardTimerRef.current = setTimeout(() => setScorecardVisible(true), 3000);
        } else {
            setScorecardVisible(isFinished && !isJudgement);
        }

        // Reset when phase leaves finished/scoring
        if (!isFinished) setScorecardVisible(false);

        return () => {
            if (scorecardTimerRef.current) clearTimeout(scorecardTimerRef.current);
        };
    }, [phase, isJudgement]);

    // Minor 4: animate dealingVisibleCount from 0 → myHand.length during dealing phase
    useEffect(() => {
        if (dealingAnimRef.current) {
            clearInterval(dealingAnimRef.current);
            dealingAnimRef.current = null;
        }

        if (phase !== "dealing" || myHand.length === 0) {
            setDealingVisibleCount(0);
            return;
        }

        const total = myHand.length;
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
    }, [phase, myHand.length]);

    // Reset inspect mode when trick clears
    const playsCount = currentTrick?.plays?.length || 0;
    useEffect(() => {
        if (playsCount === 0) setInspectMode(false);
    }, [playsCount]);

    // Detect newly revealed teammates and show a 2-second announcement.
    // Compare by LENGTH so a player who reveals twice (holds both teammate
    // cards) still triggers the second announcement correctly.
    useEffect(() => {
        const curr = revealedPartners || [];
        const prev = prevRevealedPartnersRef.current;

        if (curr.length > prev.length) {
            // The newly appended reveal is always the last element
            const newPartnerId = curr[curr.length - 1];
            const names = playerNames || {};
            const resolveName = (pid) => names[pid] || pid?.substring(0, 8);

            if (revealAnnouncementTimerRef.current) {
                clearTimeout(revealAnnouncementTimerRef.current);
            }
            setRevealAnnouncement({
                playerName: resolveName(newPartnerId),
                bidderName: resolveName(leader),
            });
            revealAnnouncementTimerRef.current = setTimeout(
                () => setRevealAnnouncement(null),
                2000
            );
        }
        // Store a snapshot so length comparisons survive re-renders
        prevRevealedPartnersRef.current = [...curr];
    }, [revealedPartners]); // eslint-disable-line

    // Cleanup timer on unmount
    useEffect(() => () => {
        if (revealAnnouncementTimerRef.current) clearTimeout(revealAnnouncementTimerRef.current);
    }, []);

    // Trump-announce countdown: 5-second visual countdown matching server timer
    useEffect(() => {
        if (trumpCountdownRef.current) {
            clearInterval(trumpCountdownRef.current);
            trumpCountdownRef.current = null;
        }
        if (phase !== "trump-announce") {
            setTrumpCountdown(5);
            return;
        }
        setTrumpCountdown(5);
        trumpCountdownRef.current = setInterval(() => {
            setTrumpCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(trumpCountdownRef.current);
                    trumpCountdownRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (trumpCountdownRef.current) clearInterval(trumpCountdownRef.current);
        };
    }, [phase]);

    // ── Partner / relation logic ───────────────────────────────────────────
    // These must all live ABOVE any early return (Rules of Hooks).

    const allPartnersRevealed =
        (partnerCards?.length ?? 0) > 0 &&
        partnerCards.every((pc) => pc.revealed);

    // Server-confirmed team membership (public info as reveals happen)
    const myTeam = teams?.bid?.includes(userId)
        ? "bid"
        : teams?.oppose?.includes(userId)
        ? "oppose"
        : null;

    // Private hand-based inference (only the local user sees this).
    // Groups partner cards by {suit, rank} and uses whichCopy to determine
    // how many copies are actually available to non-leader players.
    //   whichCopy === null   → leader holds 1 copy, only 1 copy available
    //   whichCopy !== null   → leader holds 0 copies, 2 copies available
    const myKnownRelation = useMemo(() => {
        if (!partnerCards?.length || !myHand?.length) return null;
        if (!["powerhouse", "playing"].includes(phase)) return null;
        // Only skip inference when server has confirmed us on the bid team
        // (after our partner card was revealed). "oppose" is the default for
        // ALL non-leaders, so we still need to infer when myTeam === "oppose".
        if (myTeam === "bid") return null;
        // When all partners are revealed, server data is fully authoritative — skip inference
        if (allPartnersRevealed) return null;

        const is2Deck = configKey?.includes("2D");

        if (!is2Deck) {
            // 1-deck: if I hold any UNREVEALED partner card slot → certain teammate.
            // Skip revealed slots — those are already filled by the revealed player.
            for (const pc of partnerCards) {
                if (!pc.card || pc.revealed) continue;
                const inHand = myHand.some(
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
            const myCount = myHand.filter(
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
    }, [partnerCards, myHand, configKey, phase, myTeam, allPartnersRevealed]); // eslint-disable-line

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

    if (!phase) {
        return <div className="game-board-loading">Loading game state...</div>;
    }

    const biddingCurrentTurn = isJudgement
        ? bidding?.bidOrder?.[bidding?.currentBidderIndex]
        : bidding?.currentTurn;

    const getName = (pid) => playerNames[pid] || pid?.substring(0, 8);
    const isBidLeader = leader === userId;
    const isMyTurn =
        phase === "bidding"
            ? (isJudgement
                ? bidding?.bidOrder?.[bidding?.currentBidderIndex] === userId
                // Open bidding: any non-passed active player "has a turn"
                : !bidding?.passed?.includes(userId))
            : phase === "playing"
            ? currentTrick?.currentTurn === userId
            : false;

    const handleQuitGame = () => {
        WsQuitGame();
        setShowQuitConfirm(false);
    };

    // --- Phase-aware helpers for CircularTable ---

    const cardCountCtx = { configKey, handSizes, currentRound, currentTrick, phase };

    const getIsTurn = (pid) => {
        switch (phase) {
            case "trump-announce":
                return false; // passive phase, dealer has a button not a "turn"
            case "shuffling":
            case "dealing":
                return pid === dealer;
            case "bidding":
                return pid === biddingCurrentTurn;
            case "powerhouse":
                return pid === leader;
            case "playing":
                return pid === currentTrick?.currentTurn;
            default:
                return false;
        }
    };

    const getCardCount = (pid) => gameConfig.getCardCount(pid, cardCountCtx);

    const getTeamClass = (pid) => {
        if (["shuffling", "dealing", "bidding", "powerhouse"].includes(phase)) return "";
        const isBidTeam = teams?.bid?.includes(pid);
        const isOppose = teams?.oppose?.includes(pid);
        if (isBidTeam) return "team-bid";
        if (isOppose && leader) return "team-oppose";
        return "";
    };

    const scoreCtx = { tricks, tricksWon };

    // ── Relation resolver (per opponent seat) ─────────────────────────────
    // Returns "teammate" | "opponent" | "potential-teammate" | null
    const getRelation = (pid) => {
        if (pid === userId) return null;

        const pidIsLeader          = pid === leader;
        const pidIsRevealedPartner = (revealedPartners || []).includes(pid);
        const pidOnBid             = (teams?.bid || []).includes(pid);
        const partnerCardsChosen   = (partnerCards?.length ?? 0) > 0;

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

    const getJudgementScoreContent = (pid) => {
        if (!isJudgement) return null;
        if (phase === "bidding") {
            const bid = bidding?.bids?.[pid];
            if (bid === undefined) {
                return (
                    <div className="jdg-seat-status jdg-waiting">
                        <span className="jdg-q">??</span>
                        <span className="jdg-label">bid</span>
                    </div>
                );
            }
            return (
                <div className="jdg-seat-status jdg-bid-placed">
                    <span className="jdg-bid-num">{bid}</span>
                    <span className="jdg-label">bid</span>
                </div>
            );
        }
        if (phase === "playing") {
            const bid = bidding?.bids?.[pid] ?? "?";
            const won = tricksWon?.[pid] || 0;
            const onTarget = typeof bid === "number" && won === bid;
            const over = typeof bid === "number" && won > bid;
            return (
                <div className={`jdg-seat-status jdg-playing ${onTarget ? "jdg-on-target" : over ? "jdg-over" : "jdg-under"}`}>
                    <span className="jdg-tricks">{won}</span>
                    <span className="jdg-sep">/</span>
                    <span className="jdg-bid-target">{bid}</span>
                </div>
            );
        }
        return null;
    };

    const buildPlayerList = () => {
        return (seatOrder || []).map((pid) => ({
            id: pid,
            name: getName(pid),
            isMe: pid === userId,
            isLeader: gameConfig.hasPartners && pid === leader,
            isDealer: pid === dealer,
            isPartner: revealedPartners?.includes(pid),
            isTurn: getIsTurn(pid),
            teamClass: getTeamClass(pid),
            cardCount: getCardCount(pid),
            score: gameConfig.getSeatScore(pid, scoreCtx),
            avatarInitial: getName(pid).charAt(0).toUpperCase(),
            avatar: playerAvatars[pid] || "",
            relation: getRelation(pid),
            scoreContent: getJudgementScoreContent(pid),
        }));
    };

    // For Judgement, keep the table visible until the scorecard delay has elapsed
    const isTablePhase = ["trump-announce", "shuffling", "dealing", "bidding", "powerhouse", "playing"].includes(phase)
        || (isJudgement && (phase === "finished" || phase === "scoring") && !scorecardVisible);
    const isPlayingPhase = phase === "playing";

    // Center content for CircularTable based on phase
    const renderCenterContent = ({ seatPositionMap, tableSize }) => {
        if (phase === "trump-announce") {
            const isDealer = dealer === userId;
            return (
                <div className="trump-announce-center">
                    <div className="trump-announce-title">Trump Suit is...</div>
                    <div className={`trump-announce-watermark ${isRedSuit(trumpSuit) ? "red" : "black"}`}>
                        {suitSymbol(trumpSuit)}
                    </div>
                    <div className="trump-announce-sub">
                        {trumpMode === "fixed" ? "Fixed rotation" : "Drawn randomly"}
                    </div>
                    <div className="trump-announce-countdown">
                        Proceeding to shuffle in {trumpCountdown}s...
                    </div>
                    {isDealer && (
                        <button className="btn-primary trump-announce-proceed" onClick={WsProceedToShuffle}>
                            Proceed to Shuffle
                        </button>
                    )}
                </div>
            );
        }

        if (phase === "shuffling") {
            return (
                <ShufflingPanel
                    isTableCenter
                    dealer={dealer}
                    userId={userId}
                    shuffleQueue={shuffleQueue}
                    getName={getName}
                    currentGameNumber={gameConfig.getSeriesInfo({ currentGameNumber, totalGames, seriesRoundIndex, totalRoundsInSeries }).current}
                    totalGames={gameConfig.getSeriesInfo({ currentGameNumber, totalGames, seriesRoundIndex, totalRoundsInSeries }).total}
                    gameLabel={gameConfig.gameLabel}
                />
            );
        }

        if (phase === "dealing") {
            const dealerIdx = (seatOrder || []).indexOf(dealer);
            return (
                <DealingOverlay
                    isTableCenter
                    myHand={myHand}
                    dealingConfig={dealingConfig}
                    isDealer={dealer === userId}
                    visibleCount={dealingVisibleCount}
                    seatOrder={seatOrder || []}
                    dealerIndex={dealerIdx >= 0 ? dealerIdx : 0}
                    userId={userId}
                    seatPositionMap={seatPositionMap}
                    tableSize={tableSize}
                />
            );
        }

        if (phase === "bidding") {
            if (isJudgement) {
                const totalBids = bidding?.totalBids || 0;
                return (
                    <div className="jdg-bid-center">
                        <div className="jdg-bid-center-name">{getName(biddingCurrentTurn)}</div>
                        <div className="jdg-bid-center-turn-label">is bidding</div>
                        <div className="jdg-bid-center-tally">
                            <span className="jdg-bid-center-count">{totalBids}</span>
                            <span className="jdg-bid-center-sep">/</span>
                            <span className="jdg-bid-center-cards">{currentCardsPerRound || 0}</span>
                        </div>
                        <div className="jdg-bid-center-sub">bids placed</div>
                    </div>
                );
            }

            return <BidCenterDisplay bidding={bidding} getName={getName} />;
        }

        if (phase === "powerhouse") {
            if (!gameConfig.hasPowerhouse) return null;

            if (!powerHouseSuit) {
                if (isBidLeader) {
                    return (
                        <PowerHouseSelector
                            isTableCenter
                            powerHouseSuit={powerHouseSuit}
                            partnerCards={partnerCards}
                            myHand={myHand}
                            configKey={configKey}
                            partnerCardCount={partnerCardCount}
                        />
                    );
                }
                return (
                    <div className="powerhouse-waiting-center">
                        <div className="waiting-label">Selecting PowerHouse...</div>
                        <div className="waiting-name">{getName(leader)}</div>
                    </div>
                );
            }

            return (
                <div className="powerhouse-waiting-center">
                    <div className={`waiting-suit-symbol ${isRedSuit(powerHouseSuit) ? "red" : "black"}`}>
                        {suitSymbol(powerHouseSuit)}
                    </div>
                    <div className="waiting-label">
                        {isBidLeader ? "Select Teammates" : "Selecting Teammates..."}
                    </div>
                    {!isBidLeader && <div className="waiting-name">{getName(leader)}</div>}
                </div>
            );
        }

        const activeTrumpSuit = gameConfig.getTrumpSuit({ powerHouseSuit, trumpSuit });
        return (
            <>
                {activeTrumpSuit && (
                    <div className={`powersuit-watermark ${isRedSuit(activeTrumpSuit) ? "red" : "black"}`}>
                        {suitSymbol(activeTrumpSuit)}
                    </div>
                )}
                <PlayArea
                    plays={currentTrick?.plays || []}
                    inspectMode={inspectMode}
                    onToggleInspect={() => setInspectMode(!inspectMode)}
                    getCardSvg={getCardComponent}
                    cardKeyFn={cardKey}
                    getName={getName}
                    seatPositionMap={seatPositionMap}
                    tableSize={tableSize}
                    roundLabel={gameConfig.getRoundLabel({ currentRound, seriesRoundIndex, totalRoundsInSeries, currentCardsPerRound })}
                    seatOrder={seatOrder}
                    tricksCount={tricks?.length || 0}
                    lastTrickWinner={tricks?.length > 0 ? tricks[tricks.length - 1].winner : null}
                    lastTrickCards={tricks?.length > 0 ? tricks[tricks.length - 1].cards : null}
                />
            </>
        );
    };

    return (
        <div className="game-board">
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

            {error && <div className="game-error-banner">{error}</div>}

            {/* Non-table phases: use horizontal player list */}
            {!isTablePhase && (
                <PlayerList
                    seatOrder={seatOrder}
                    handSizes={handSizes}
                    teams={teams}
                    revealedPartners={revealedPartners}
                    currentTurn={phase === "bidding" ? biddingCurrentTurn : currentTrick?.currentTurn}
                    leader={leader}
                    dealer={dealer}
                    userId={userId}
                    scores={scores}
                    playerAvatars={playerAvatars}
                    getName={getName}
                />
            )}

            {/* Table phases: CircularTable with phase-specific center content */}
            {isTablePhase && (
                <>
                    {/* Minor 1: TeamScoreHUD (with scoreboard button) shows during ALL table phases */}
                    {gameConfig.HUD && (
                        <gameConfig.HUD
                            tricks={tricks}
                            teams={teams}
                            leader={leader}
                            partnerCards={partnerCards}
                            phase={phase}
                            removedTwos={removedTwos || []}
                        />
                    )}

                    {gameConfig.hasPartners && isPlayingPhase && (
                        <PartnerCardDisplay
                            partnerCards={partnerCards}
                            powerHouseSuit={powerHouseSuit}
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
                        {/* Top-left: Judgement info HUD */}
                        {isJudgement && (
                            <div className="jdg-info-hud">
                                <div className="jdg-hud-pill">
                                    <span className={`jdg-hud-suit ${isRedSuit(trumpSuit || "S") ? "red" : "black"}`}>
                                        {suitSymbol(trumpSuit || "S")}
                                    </span>
                                    <span className="jdg-hud-pill-label">Trump</span>
                                </div>
                                <div className="jdg-hud-divider" />
                                <div className="jdg-hud-pill">
                                    <span className="jdg-hud-pill-value">
                                        {(seriesRoundIndex || 0) + 1}/{totalRoundsInSeries || 1}
                                    </span>
                                    <span className="jdg-hud-pill-label">Round</span>
                                </div>
                                <div className="jdg-hud-divider" />
                                <div className="jdg-hud-pill">
                                    <span className="jdg-hud-pill-value">{currentCardsPerRound || 0}</span>
                                    <span className="jdg-hud-pill-label">Cards</span>
                                </div>
                                <div className="jdg-hud-divider" />
                                <button
                                    className="hud-scoreboard-btn"
                                    onClick={() => setShowJdgScoreboard(true)}
                                    title="View scoreboard"
                                >
                                    ⊞
                                </button>
                            </div>
                        )}

                        {/* Top-right: Quit button (both games, admin only) */}
                        {isAdmin && (
                            <button
                                className="btn-danger btn-sm table-quit-btn"
                                onClick={() => setShowQuitConfirm(true)}
                            >
                                Quit
                            </button>
                        )}

                        <CircularTable
                            players={buildPlayerList()}
                            centerContent={renderCenterContent}
                        />

                        {/* Partner picker overlay — covers CircularTable during partner selection */}
                        {gameConfig.hasPowerhouse && phase === "powerhouse" && powerHouseSuit && isBidLeader && (
                            <div className="partner-picker-overlay">
                                <PowerHouseSelector
                                    isOverlay
                                    powerHouseSuit={powerHouseSuit}
                                    partnerCards={partnerCards}
                                    myHand={myHand}
                                    configKey={configKey}
                                    partnerCardCount={partnerCardCount}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            {scorecardVisible && (
                <gameConfig.ScoreBoard
                    // Shared props
                    seatOrder={seatOrder}
                    scores={scores}
                    getName={getName}
                    phase={phase}
                    nextRoundReady={nextRoundReady}
                    userId={userId}
                    // Kaliteri props
                    teams={teams}
                    tricks={tricks}
                    scoringResult={scoringResult}
                    bidding={bidding}
                    isAdmin={isAdmin}
                    onQuitGame={() => setShowQuitConfirm(true)}
                    currentGameNumber={currentGameNumber}
                    totalGames={totalGames}
                    // Judgement props
                    roundResults={roundResults}
                    trumpCard={trumpCard}
                    trumpSuit={trumpSuit}
                    scoreboardTimeMs={scoreboardTimeMs}
                    seriesRoundIndex={seriesRoundIndex}
                    totalRoundsInSeries={totalRoundsInSeries}
                />
            )}

            {/* Judgement scoreboard modal — accessible during all table phases */}
            {isJudgement && showJdgScoreboard && (
                <JudgementScoreboardModal onClose={() => setShowJdgScoreboard(false)} />
            )}

            {phase === "series-finished" && (
                <SeriesFinishedPanel
                    finalRankings={finalRankings}
                    scores={scores}
                    seatOrder={seatOrder}
                    getName={getName}
                    userId={userId}
                    playerAvatars={playerAvatars}
                    onReturnToLobby={() => { WsReturnToLobby(); clearGameState(); }}
                />
            )}

            {/* Player hand — hidden during shuffling/dealing and while reveal overlay is active */}
            {phase !== "finished" &&
             phase !== "series-finished" &&
             phase !== "shuffling" &&
             phase !== "dealing" &&
             !showDealReveal && (
                <PlayerHand
                    cards={myHand}
                    validPlays={validPlays}
                    isMyTurn={isMyTurn && phase === "playing"}
                />
            )}

            {/* Bidding controls below the hand */}
            {phase === "bidding" && !showDealReveal && (
                <gameConfig.BiddingPanel
                    bidding={bidding}
                    userId={userId}
                    cardsInRound={currentCardsPerRound}
                    getName={getName}
                />
            )}

            {/* Click-to-reveal overlay: triggers after dealing phase completes */}
            {showDealReveal && myHand.length > 0 && (
                <DealRevealOverlay
                    key={dealRevealKeyRef.current}
                    cards={myHand}
                    onComplete={handleRevealComplete}
                />
            )}
        </div>
    );
};

export default GameBoard;
