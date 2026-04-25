import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { WsRequestGameState, WsQuitGame, WsReturnToLobby, WsPickClosedTrump, WsRevealTrump } from "../../api/wsEmitters";
import BidCenterDisplay from "./BidCenterDisplay";
import PowerHouseSelector from "./PowerHouseSelector";
import PlayerHand from "./PlayerHand";
import PlayerList from "./PlayerList";
import JudgementScoreboardModal from "./JudgementScoreboardModal";
import PartnerCardDisplay from "./PartnerCardDisplay";
import DealRevealOverlay from "./DealRevealOverlay";
import { CircularTable, PlayArea, PlayerSeat } from "../shared";
import { getCardComponent, cardKey, suitSymbol, isRedSuit } from "./utils/cardMapper";
import ShufflingPanel from "./ShufflingPanel";
import DealingOverlay from "./DealingOverlay";
import SeriesFinishedPanel from "./SeriesFinishedPanel";
import { getGameConfig } from "./gameRegistry";
import { clearGameState } from "../../api/wsGameListeners";
import ClosedTrumpDisplay from "./ClosedTrumpDisplay";
import RevealTrumpPrompt from "./RevealTrumpPrompt";

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

    // Mendikot-specific selectors
    const isMendikot = gameType === "mendikot";
    const trump_suit = useSelector((state) => state.game.trump_suit);
    const closedTrumpHolderId = useSelector((state) => state.game.closed_trump_holder_id);
    const closedTrumpRevealed = useSelector((state) => state.game.closed_trump_revealed);
    const closedTrumpPlaceholder = useSelector((state) => state.game.closed_trump_placeholder);
    const pendingTrumpRevealDecision = useSelector((state) => state.game.pending_trump_reveal_decision);
    const tricksByTeam = useSelector((state) => state.game.tricks_by_team);
    const currentRoundNumber = useSelector((state) => state.game.currentRoundNumber);
    const totalRounds = useSelector((state) => state.game.totalRounds);

    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const [inspectMode, setInspectMode] = useState(false);
    const [showJdgScoreboard, setShowJdgScoreboard] = useState(false);
    const [showDealReveal, setShowDealReveal] = useState(false);
    const [closeHudScoreboardSignal, setCloseHudScoreboardSignal] = useState(0);
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
    const [trumpDismissedForRound, setTrumpDismissedForRound] = useState(-1);
    const [trumpCountdown, setTrumpCountdown] = useState(3);
    const prevRevealedPartnersRef = useRef([]);
    const revealAnnouncementTimerRef = useRef(null);

    useEffect(() => {
        WsRequestGameState();
    }, []);

    // Judgement: auto-dismiss the trump reveal after 3s
    useEffect(() => {
        if (phase === "shuffling" && isJudgement && trumpDismissedForRound !== seriesRoundIndex) {
            const timer = setTimeout(() => {
                setTrumpDismissedForRound(seriesRoundIndex);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [phase, isJudgement, trumpDismissedForRound, seriesRoundIndex]);

    // Reset countdown when a new trump panel appears
    useEffect(() => {
        if (phase === "shuffling" && isJudgement && trumpDismissedForRound !== seriesRoundIndex) {
            setTrumpCountdown(3);
        }
    }, [phase, isJudgement, seriesRoundIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // Tick countdown while trump panel is visible
    useEffect(() => {
        if (phase === "shuffling" && isJudgement && trumpDismissedForRound !== seriesRoundIndex && trumpCountdown > 0) {
            const timer = setTimeout(() => setTrumpCountdown((c) => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [phase, isJudgement, trumpDismissedForRound, seriesRoundIndex, trumpCountdown]);

    // Show deal-reveal overlay for the duration of the card-reveal phase.
    // The server owns the timer; the client simply mirrors the phase.
    useEffect(() => {
        const prev = prevPhaseRef.current;
        const curr = phase;
        if (curr === "card-reveal" && prev !== "card-reveal") {
            setCloseHudScoreboardSignal((v) => v + 1);
            setShowJdgScoreboard(false);
            dealRevealKeyRef.current += 1;
            setShowDealReveal(true);
        }
        if (prev === "card-reveal" && curr !== "card-reveal") {
            setShowDealReveal(false);
        }
        prevPhaseRef.current = curr;
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRevealComplete = useCallback(() => setShowDealReveal(false), []);

    useEffect(() => {
        if (scorecardTimerRef.current) {
            clearTimeout(scorecardTimerRef.current);
            scorecardTimerRef.current = null;
        }

        const isFinished = phase === "scoring" || phase === "finished" || phase === "series-finished";

        // Judgement has no between-round scoreboard — skip entirely
        if (!isJudgement) {
            setScorecardVisible(isFinished);
        }

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
        phase === "band-hukum-pick"
            ? userId === closedTrumpHolderId
        : phase === "bidding"
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
            case "shuffling":
            case "dealing":
                return pid === dealer;
            case "band-hukum-pick":
                return pid === closedTrumpHolderId;
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
        if (["shuffling", "dealing", "bidding", "powerhouse", "band-hukum-pick"].includes(phase)) return "";
        if (isMendikot) {
            if ((teams?.A || []).includes(pid)) return "mendikot-team-a-seat";
            if ((teams?.B || []).includes(pid)) return "mendikot-team-b-seat";
            return "";
        }
        const isBidTeam = teams?.bid?.includes(pid);
        const isOppose = teams?.oppose?.includes(pid);
        if (isBidTeam) return "team-bid";
        if (isOppose && leader) return "team-oppose";
        return "";
    };

    const scoreCtx = { tricks, tricksWon, tricks_by_team: tricksByTeam, teams };

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

    const isTablePhase = ["shuffling", "dealing", "bidding", "powerhouse", "playing", "band-hukum-pick"].includes(phase);
    const isPlayingPhase = phase === "playing";
    const showPlayerHand =
        phase !== "finished" &&
        phase !== "series-finished" &&
        phase !== "shuffling" &&
        phase !== "dealing" &&
        !showDealReveal &&
        !(phase === "band-hukum-pick" && userId !== closedTrumpHolderId);
    const showMySeatWidget = isTablePhase && showPlayerHand;

    // Center content for CircularTable based on phase
    const renderCenterContent = ({ seatPositionMap, tableSize }) => {
        if (phase === "shuffling") {
            if (isJudgement && trumpDismissedForRound !== seriesRoundIndex) {
                return (
                    <div
                        className="trump-overlay-backdrop trump-overlay-backdrop--table"
                        onClick={() => setTrumpDismissedForRound(seriesRoundIndex)}
                    >
                        <div className="trump-overlay-panel" onClick={(e) => e.stopPropagation()}>
                            <div className="trump-announce-title">Trump Suit Is...</div>
                            <div className={`trump-announce-watermark ${isRedSuit(trumpSuit) ? "red" : "black"}`}>
                                {suitSymbol(trumpSuit)}
                            </div>
                            <div className="trump-announce-sub">
                                {trumpMode === "fixed" ? "Fixed rotation" : "Drawn randomly"}
                            </div>
                            <div className="trump-dismiss-hint">
                                {trumpCountdown > 0 ? trumpCountdown : "·"} · tap to dismiss
                            </div>
                        </div>
                    </div>
                );
            }
            return (
                <ShufflingPanel
                    isTableCenter
                    dealer={dealer}
                    userId={userId}
                    shuffleQueue={shuffleQueue}
                    getName={getName}
                    currentGameNumber={gameConfig.getSeriesInfo({ currentGameNumber, totalGames, seriesRoundIndex, totalRoundsInSeries, currentRoundNumber, totalRounds }).current}
                    totalGames={gameConfig.getSeriesInfo({ currentGameNumber, totalGames, seriesRoundIndex, totalRoundsInSeries, currentRoundNumber, totalRounds }).total}
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

        if (phase === "band-hukum-pick") {
            const pickerName = playerNames?.[closedTrumpHolderId] || closedTrumpHolderId;
            return (
                <div className="band-hukum-pick-center">
                    {userId === closedTrumpHolderId ? (
                        <>
                            <div className="band-hukum-pick-title">Pick a card to hide as trump</div>
                            <div className="band-hukum-pick-sub">Your cards are face-down below — tap one to select it</div>
                        </>
                    ) : (
                        <>
                            <div className="band-hukum-pick-title">Waiting for {pickerName}</div>
                            <div className="band-hukum-pick-sub">to pick a hidden trump card</div>
                        </>
                    )}
                </div>
            );
        }

        const activeTrumpSuit = gameConfig.getTrumpSuit({ powerHouseSuit, trumpSuit, trump_suit });
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
                    trumpSuit={activeTrumpSuit}
                    getName={getName}
                    seatPositionMap={seatPositionMap}
                    tableSize={tableSize}
                    roundLabel={gameConfig.getRoundLabel({ currentRound, seriesRoundIndex, totalRoundsInSeries, currentCardsPerRound, currentRoundNumber, totalRounds })}
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
                            closeScoreboardSignal={closeHudScoreboardSignal}
                        />
                    )}

                    {gameConfig.hasPartners && isPlayingPhase && (
                        <PartnerCardDisplay
                            partnerCards={partnerCards}
                            powerHouseSuit={powerHouseSuit}
                            getName={getName}
                        />
                    )}

                    {/* Mendikot: hidden trump indicator */}
                    {isMendikot && isPlayingPhase && closedTrumpPlaceholder && !closedTrumpRevealed && (
                        <ClosedTrumpDisplay placeholder={closedTrumpPlaceholder} />
                    )}

                    {/* Mendikot: reveal trump prompt for void player */}
                    {isMendikot && isPlayingPhase &&
                        currentTrick?.currentTurn === userId &&
                        pendingTrumpRevealDecision?.canReveal && (
                        <RevealTrumpPrompt onReveal={WsRevealTrump} />
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
                    seriesRoundIndex={seriesRoundIndex}
                    totalRoundsInSeries={totalRoundsInSeries}
                />
            )}

            {/* Judgement scoreboard modal — accessible during all table phases */}
            {isJudgement && showJdgScoreboard && (
                <JudgementScoreboardModal onClose={() => setShowJdgScoreboard(false)} />
            )}

            {phase === "series-finished" && !isMendikot && (
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
            {showPlayerHand && (
                showMySeatWidget ? (
                    <div className="player-hand-shell">
                        <div
                            className={`my-seat-widget${isMyTurn ? " active-turn" : ""}`}
                            style={isMyTurn ? {
                                // Bottom seat: angle = π/2 (90°)
                                "--seat-angle-deg": 90,
                                "--arrow-dx": "0px",
                                "--arrow-dy": "-38px",
                            } : undefined}
                        >
                            <PlayerSeat
                                name="You"
                                avatarInitial={getName(userId).charAt(0).toUpperCase()}
                                avatar={playerAvatars[userId] || ""}
                                isMe={true}
                                isTurn={getIsTurn(userId)}
                                isLeader={gameConfig.hasPartners && userId === leader}
                                isDealer={userId === dealer}
                                isPartner={false}
                                cardCount={0}
                                score={gameConfig.getSeatScore(userId, scoreCtx)}
                                relation={null}
                                scoreContent={getJudgementScoreContent(userId)}
                                showCardFan={false}
                            />
                        </div>
                        <PlayerHand
                            cards={myHand}
                            validPlays={validPlays}
                            isMyTurn={isMyTurn && (phase === "playing" || phase === "band-hukum-pick")}
                            onCardClick={
                                phase === "band-hukum-pick" && userId === closedTrumpHolderId
                                    ? (card, index) => WsPickClosedTrump(index)
                                    : undefined
                            }
                        />
                    </div>
                ) : (
                    <PlayerHand
                        cards={myHand}
                        validPlays={validPlays}
                        isMyTurn={isMyTurn && (phase === "playing" || phase === "band-hukum-pick")}
                        onCardClick={
                            phase === "band-hukum-pick" && userId === closedTrumpHolderId
                                ? (card, index) => WsPickClosedTrump(index)
                                : undefined
                        }
                    />
                )
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
