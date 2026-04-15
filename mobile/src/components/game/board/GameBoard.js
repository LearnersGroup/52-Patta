import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';
import { resetGame } from '../../../redux/slices/game';
import { WsPickClosedTrump, WsPlayCard, WsQuitGame, WsReturnToLobby, WsRevealTrump } from '../../../api/wsEmitters';
import { cardTokens, colors, fonts, panelStyle, spacing, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import PlayerHand from '../PlayerHand';
import { cardKey, isCardInList, suitSymbol } from '../utils/cardMapper';
import { hapticHeavy, hapticLong, hapticSuccess, hapticWarning } from '../../../utils/haptics';
import BiddingPanel from './BiddingPanel';
import CircularTable from './CircularTable';
import DealRevealOverlay from './DealRevealOverlay';
import DealingOverlay from './DealingOverlay';
import JudgementBiddingPanel from './JudgementBiddingPanel';
import MendikotHUD from './MendikotHUD';
import MendikotScoreBoard from './MendikotScoreBoard';
import PlayArea from './PlayArea';
import PlayerSeat from './PlayerSeat';
import PowerHouseSelector from './PowerHouseSelector';
import ScoreTable from './ScoreTable';
import SeriesFinishedPanel from './SeriesFinishedPanel';
import ShufflingPanel from './ShufflingPanel';
import TeamScoreHUD from './TeamScoreHUD';
import InGameSettings from './InGameSettings';
import TrumpAnnouncePanel from './TrumpAnnouncePanel';
import ClosedTrumpDisplay from '../ClosedTrumpDisplay';
import RevealTrumpPrompt from '../RevealTrumpPrompt';

const INTENDED_W = Math.round(cardTokens.sizes.play.width * 0.8);  // 20% smaller
const MENDIKOT_TEAM_A_COLOR = '#38bdf8';
const MENDIKOT_TEAM_B_COLOR = '#f472b6';

const IntendedCardSlot = memo(function IntendedCardSlot({ card, shouldBounce, onPress }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (shouldBounce) {
      bounce.value = withRepeat(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      bounce.value = withTiming(0, { duration: 200 });
    }
  }, [shouldBounce, bounce]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value * -8 }],
  }));

  const SLOT_H = Math.round(INTENDED_W * (7 / 5));

  return (
    <Pressable style={styles.intendedSlot} onPressIn={card ? onPress : undefined}>
      {/* Arrow indicator */}
      <Text style={styles.intendedArrow}>^</Text>
      {card ? (
        <Animated.View style={[
          styles.intendedCardWrap,
          shouldBounce && styles.intendedPlayable,
          animStyle,
        ]}>
          <CardFace
            card={card}
            width={INTENDED_W}
            playable={shouldBounce}
            selected
          />
        </Animated.View>
      ) : (
        <View style={[styles.intendedEmpty, { width: INTENDED_W, height: SLOT_H }]} />
      )}
    </Pressable>
  );
});

const ScoreboardModal = memo(function ScoreboardModal({ visible, onClose, seatOrder, scores, getName, gameType, roundResults, tricksWon, bidding, phase, userId, gameHistory }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={styles.sbHeader}>
            <Text style={styles.sbTitle}>Scoreboard</Text>
            <Pressable style={styles.sbClose} onPress={onClose} hitSlop={10}>
              <Text style={styles.sbCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScoreTable
            seatOrder={seatOrder}
            scores={scores}
            getName={getName}
            gameType={gameType}
            userId={userId}
            roundResults={roundResults}
            tricksWon={tricksWon}
            bidding={bidding}
            phase={phase}
            gameHistory={gameHistory}
          />

        </View>
      </View>
    </Modal>
  );
});

/* ── Partner reveal announcement toast ── */
const RevealAnnouncement = memo(function RevealAnnouncement({ playerName, bidderName }) {
  return (
    <View style={styles.revealToast}>
      <Text style={styles.revealText}>
        <Text style={styles.revealPlayer}>{playerName}</Text>
        {' is '}
        <Text style={styles.revealBidder}>{bidderName}</Text>
        {"'s teammate!"}
      </Text>
    </View>
  );
});

const TrumpRevealRequestAnnouncement = memo(function TrumpRevealRequestAnnouncement({ playerName, playerColor }) {
  return (
    <View style={[styles.revealToast, styles.trumpRevealToast]}>
      <Text style={styles.revealText}>
        <Text style={[styles.revealPlayer, playerColor ? { color: playerColor } : null]}>{playerName}</Text>
        {' requested to reveal trump'}
      </Text>
    </View>
  );
});

export default function GameBoard({ userId, isAdmin = false }) {
  const dispatch = useDispatch();
  const gameType = useSelector((state) => state.game.game_type) || 'kaliteri';
  const phase = useSelector((state) => state.game.phase);
  const configKey = useSelector((state) => state.game.configKey);
  const seatOrder = useSelector((state) => state.game.seatOrder);
  const playerNames = useSelector((state) => state.game.playerNames);
  const playerAvatars = useSelector((state) => state.game.playerAvatars);
  const myHand = useSelector((state) => state.game.myHand);
  const validPlays = useSelector((state) => state.game.validPlays);
  const currentTrick = useSelector((state) => state.game.currentTrick);
  const handSizes = useSelector((state) => state.game.handSizes);
  const shuffleQueue = useSelector((state) => state.game.shuffleQueue);
  const dealingConfig = useSelector((state) => state.game.dealingConfig);
  const bidding = useSelector((state) => state.game.bidding);
  const leader = useSelector((state) => state.game.leader);
  const dealer = useSelector((state) => state.game.dealer);
  const teams = useSelector((state) => state.game.teams);
  const tricks = useSelector((state) => state.game.tricks);
  const scores = useSelector((state) => state.game.scores);
  const nextRoundReady = useSelector((state) => state.game.nextRoundReady);
  const finalRankings = useSelector((state) => state.game.finalRankings);
  const partnerCards = useSelector((state) => state.game.partnerCards);
  const partnerCardCount = useSelector((state) => state.game.partnerCardCount);
  const powerHouseSuit = useSelector((state) => state.game.powerHouseSuit);
  const trumpSuit = useSelector((state) => state.game.trumpSuit);
  const trumpCard = useSelector((state) => state.game.trumpCard);
  const tricksWon = useSelector((state) => state.game.tricksWon);
  const currentRound = useSelector((state) => state.game.currentRound);
  const currentCardsPerRound = useSelector((state) => state.game.currentCardsPerRound);
  const seriesRoundIndex = useSelector((state) => state.game.seriesRoundIndex);
  const totalRoundsInSeries = useSelector((state) => state.game.totalRoundsInSeries);
  const roundResults = useSelector((state) => state.game.roundResults);
  const currentGameNumber = useSelector((state) => state.game.currentGameNumber);
  const totalGames = useSelector((state) => state.game.totalGames);
  const scoreboardTimeMs = useSelector((state) => state.game.scoreboardTimeMs);
  const cardRevealTimeMs = useSelector((state) => state.game.cardRevealTimeMs);
  const trumpMode = useSelector((state) => state.game.trumpMode);
  const bidTimeMs = useSelector((state) => state.game.bidTimeMs);
  const revealedPartners = useSelector((state) => state.game.revealedPartners);
  const gameHistory = useSelector((state) => state.game.gameHistory);
  const autoplay = useSelector((state) => state.preferences.autoplay);

  // Mendikot-specific selectors
  const isMendikot           = gameType === 'mendikot';
  const closedTrumpHolderId  = useSelector((s) => s.game.closed_trump_holder_id);
  const closedTrumpRevealed  = useSelector((s) => s.game.closed_trump_revealed);
  const closedTrumpPlaceholder = useSelector((s) => s.game.closed_trump_placeholder);
  const closedTrumpCard      = useSelector((s) => s.game.closed_trump_card);
  const trumpAskerId         = useSelector((s) => s.game.trump_asker_id);
  const pendingTrumpReveal   = useSelector((s) => s.game.pending_trump_reveal_decision);
  const trumpSuitMendikot    = useSelector((s) => s.game.trump_suit);
  const tricksByTeam         = useSelector((s) => s.game.tricks_by_team);
  const currentRoundNumber   = useSelector((s) => s.game.currentRoundNumber);
  const totalRounds          = useSelector((s) => s.game.totalRounds);

  const tableShape = useSelector((state) => state.preferences.tableShape);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDealReveal, setShowDealReveal] = useState(false);
  const [judgementBidCountdown, setJudgementBidCountdown] = useState(null);
  const [intendedCard, setIntendedCard] = useState(null);
  const [revealAnnouncement, setRevealAnnouncement] = useState(null);
  const [trumpRevealRequestAnnouncement, setTrumpRevealRequestAnnouncement] = useState(null);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [roundScoreCountdown, setRoundScoreCountdown] = useState(0);
  const [showSeriesFinished, setShowSeriesFinished] = useState(false);
  const prevPhaseRef = useRef(phase);
  const prevRevealedPartnersRef = useRef(revealedPartners || []);
  const prevTrumpAskerIdRef = useRef(trumpAskerId || null);
  const revealAnnouncementTimerRef = useRef(null);
  const trumpRevealRequestTimerRef = useRef(null);
  const roundScoreDelayRef = useRef(null);
  const roundScoreIntervalRef = useRef(null);

  useEffect(() => {
    const prev = prevPhaseRef.current;

    // Kaliteri / Judgement: reveal overlay fires when phase enters bidding.
    // Mendikot does NOT use DealRevealOverlay — there is no server-side inspect
    // window; players see their hand directly in band-hukum-pick (face-down)
    // or start playing immediately (Cut Hukum).
    if (prev !== 'bidding' && phase === 'bidding' && Array.isArray(myHand) && myHand.length > 0) {
      setShowDealReveal(true);
    }

    if (phase === 'lobby' || phase === null || phase === 'shuffling') {
      setShowDealReveal(false);
    }

    prevPhaseRef.current = phase;
  }, [phase, myHand]);

  // ── Partner reveal announcements ──────────────────────────────────────
  useEffect(() => {
    const curr = revealedPartners || [];
    const prev = prevRevealedPartnersRef.current;

    if (curr.length > prev.length) {
      const newPartnerId = curr[curr.length - 1];
      const resolveName = (pid) => playerNames?.[pid] || pid?.substring(0, 8) || 'Player';

      if (revealAnnouncementTimerRef.current) {
        clearTimeout(revealAnnouncementTimerRef.current);
      }
      setRevealAnnouncement({
        playerName: resolveName(newPartnerId),
        bidderName: resolveName(leader),
      });
      revealAnnouncementTimerRef.current = setTimeout(
        () => setRevealAnnouncement(null),
        2000,
      );
    }
    prevRevealedPartnersRef.current = [...curr];
  }, [revealedPartners]); // eslint-disable-line

  useEffect(() => () => {
    if (revealAnnouncementTimerRef.current) clearTimeout(revealAnnouncementTimerRef.current);
  }, []);

  // ── Mendikot: trump reveal request announcements ───────────────────────
  useEffect(() => {
    if (!isMendikot) {
      prevTrumpAskerIdRef.current = trumpAskerId || null;
      return;
    }

    const prevAsker = prevTrumpAskerIdRef.current;
    const currAsker = trumpAskerId || null;

    if (currAsker && currAsker !== prevAsker) {
      const askerName = playerNames?.[currAsker] || currAsker?.substring(0, 8) || 'Player';

      if (trumpRevealRequestTimerRef.current) {
        clearTimeout(trumpRevealRequestTimerRef.current);
      }

      setTrumpRevealRequestAnnouncement({ playerId: currAsker, playerName: askerName });
      trumpRevealRequestTimerRef.current = setTimeout(() => {
        setTrumpRevealRequestAnnouncement(null);
      }, 2000);
    }

    prevTrumpAskerIdRef.current = currAsker;
  }, [isMendikot, trumpAskerId, playerNames]);

  useEffect(() => () => {
    if (trumpRevealRequestTimerRef.current) clearTimeout(trumpRevealRequestTimerRef.current);
  }, []);

  // ── Round scoreboard (both game types: show scores after trick animation) ──
  useEffect(() => {
    const isRoundEnd = phase === 'finished';

    if (isRoundEnd) {
      // Wait for trick sweep animation (2000ms hold + 760ms sweep + buffer)
      clearTimeout(roundScoreDelayRef.current);
      clearInterval(roundScoreIntervalRef.current);
      roundScoreDelayRef.current = setTimeout(() => {
        setShowRoundScore(true);
        const displayMs = scoreboardTimeMs || 5000;
        const started = Date.now();
        setRoundScoreCountdown(Math.ceil(displayMs / 1000));
        roundScoreIntervalRef.current = setInterval(() => {
          const leftMs = Math.max(0, displayMs - (Date.now() - started));
          setRoundScoreCountdown(Math.ceil(leftMs / 1000));
          if (leftMs <= 0) {
            clearInterval(roundScoreIntervalRef.current);
            setShowRoundScore(false);
          }
        }, 250);
      }, 3000);
    }

    // Don't auto-hide on phase change — let the local timer handle it
  }, [phase, scoreboardTimeMs]);

  // Cleanup round score timers on unmount
  useEffect(() => () => {
    clearTimeout(roundScoreDelayRef.current);
    clearInterval(roundScoreIntervalRef.current);
  }, []);

  // ── Delay series-finished panel so trick sweep animation can finish ──
  useEffect(() => {
    if (phase === 'series-finished') {
      const t = setTimeout(() => setShowSeriesFinished(true), 1500);
      return () => clearTimeout(t);
    }
    setShowSeriesFinished(false);
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'bidding' || gameType !== 'judgement' || !bidTimeMs) {
      setJudgementBidCountdown(null);
      return;
    }

    const duration = Math.max(0, Number(bidTimeMs) || 0);
    const started = Date.now();
    setJudgementBidCountdown(Math.ceil(duration / 1000));

    const timer = setInterval(() => {
      const leftMs = Math.max(0, duration - (Date.now() - started));
      const next = Math.ceil(leftMs / 1000);
      setJudgementBidCountdown(next);
      if (next <= 0) clearInterval(timer);
    }, 250);

    return () => clearInterval(timer);
  }, [phase, gameType, bidTimeMs, bidding?.currentBidderIndex]);

  const getName = useCallback((pid) => playerNames?.[pid] || pid?.slice?.(0, 8) || 'Player', [playerNames]);

  const currentTurn = useMemo(() => {
    if (phase === 'bidding') {
      if (gameType === 'judgement') {
        return bidding?.bidOrder?.[bidding?.currentBidderIndex] || null;
      }
      return bidding?.currentBidder || null;
    }
    if (phase === 'band-hukum-pick') return closedTrumpHolderId || null;
    if (phase === 'playing') return currentTrick?.currentTurn || null;
    if (phase === 'powerhouse') return leader || null;
    if (phase === 'shuffling' || phase === 'dealing') return dealer || null;
    return null;
  }, [phase, gameType, bidding, currentTrick, leader, dealer, closedTrumpHolderId]);

  // ── Haptic feedback when it becomes the local player's turn ──────────
  const prevTurnRef = useRef(currentTurn);
  useEffect(() => {
    if (currentTurn === userId && prevTurnRef.current !== userId) {
      hapticLong();
    }
    prevTurnRef.current = currentTurn;
  }, [currentTurn, userId]);

  // ── Partner / relation logic (ported from web client) ──────────────
  const allPartnersRevealed =
    (partnerCards?.length ?? 0) > 0 &&
    partnerCards.every((pc) => pc.revealed);

  // Server-confirmed team membership (public info as reveals happen)
  const myTeam = teams?.bid?.includes(userId)
    ? 'bid'
    : teams?.oppose?.includes(userId)
    ? 'oppose'
    : null;

  // Private hand-based inference (only the local user sees this).
  // Groups partner cards by {suit, rank} and uses whichCopy to determine
  // how many copies are actually available to non-leader players.
  const myKnownRelation = useMemo(() => {
    if (!partnerCards?.length || !myHand?.length) return null;
    if (phase !== 'powerhouse' && phase !== 'playing') return null;
    if (myTeam === 'bid') return null;
    if (allPartnersRevealed) return null;

    const is2Deck = configKey?.includes('2D');

    if (!is2Deck) {
      for (const pc of partnerCards) {
        if (!pc.card || pc.revealed) continue;
        const inHand = myHand.some(
          (c) => c.suit === pc.card.suit && c.rank === pc.card.rank,
        );
        if (inHand) return 'certain-teammate';
      }
      return 'certain-not-teammate';
    }

    // 2-deck: group UNREVEALED partner card slots by {suit, rank}
    const groups = {};
    for (const pc of partnerCards) {
      if (!pc.card || pc.revealed) continue;
      const key = `${pc.card.suit}_${pc.card.rank}`;
      if (!groups[key]) {
        groups[key] = {
          suit: pc.card.suit,
          rank: pc.card.rank,
          slots: 0,
          leaderHoldsOne: false,
        };
      }
      groups[key].slots += 1;
      if (pc.whichCopy === null) groups[key].leaderHoldsOne = true;
    }

    let hasCertain = false;
    let hasPotential = false;

    for (const g of Object.values(groups)) {
      const myCount = myHand.filter(
        (c) => c.suit === g.suit && c.rank === g.rank,
      ).length;
      if (myCount === 0) continue;

      const copiesAvailable = g.leaderHoldsOne ? 1 : 2;
      const nonPartnerCopies = copiesAvailable - g.slots;

      if (myCount > nonPartnerCopies) {
        hasCertain = true;
        break;
      } else {
        hasPotential = true;
      }
    }

    return hasCertain ? 'certain-teammate' : hasPotential ? 'potential-teammate' : 'certain-not-teammate';
  }, [partnerCards, myHand, configKey, phase, myTeam, allPartnersRevealed]);

  // Effective team: private inference overrides the server's default "oppose"
  const myEffectiveTeam =
    allPartnersRevealed                            ? myTeam   :
    myTeam === 'bid'                               ? 'bid'    :
    myKnownRelation === 'certain-teammate'         ? 'bid'    :
    myKnownRelation === 'certain-not-teammate'     ? 'oppose' :
    myKnownRelation === 'potential-teammate'       ? null     :
    myTeam;

  // ── Relation resolver (per opponent seat) ─────────────────────────────
  // Returns "teammate" | "opponent" | "potential-teammate" | null
  const getRelation = useCallback((pid) => {
    if (gameType !== 'kaliteri') return null;
    if (phase !== 'playing' && phase !== 'powerhouse' && phase !== 'series-finished') return null;
    if (pid === userId) return null;

    const pidIsLeader          = pid === leader;
    const pidIsRevealedPartner = (revealedPartners || []).includes(pid);
    const pidOnBid             = (teams?.bid || []).includes(pid);
    const partnerCardsChosen   = (partnerCards?.length ?? 0) > 0;

    // ── Bidder (leader) seat ─────────────────────────────────────────
    if (pidIsLeader) {
      if (!partnerCardsChosen) return null;
      if (myEffectiveTeam === 'bid') return 'teammate';
      if (myKnownRelation === 'potential-teammate') return 'potential-teammate';
      if (myEffectiveTeam === 'oppose') return 'opponent';
      return null;
    }

    // ── All other seats: only visible once publicly revealed ──────────
    const pidTeamPublic = pidIsRevealedPartner || allPartnersRevealed;
    if (!pidTeamPublic) return null;

    const pidTeam = pidOnBid ? 'bid' : 'oppose';

    if (myEffectiveTeam) {
      return pidTeam === myEffectiveTeam ? 'teammate' : 'opponent';
    }

    // myEffectiveTeam is null → potential-teammate, can't commit either way
    if (myKnownRelation === 'potential-teammate' && pidTeam === 'bid') {
      return 'potential-teammate';
    }

    return null;
  }, [gameType, phase, userId, leader, teams, partnerCards, revealedPartners, allPartnersRevealed, myEffectiveTeam, myKnownRelation]);

  // Mendikot: teams.bid = team A player ids, teams.oppose = team B player ids
  // (server's mendikot strategy maps them this way in getPublicState)

  const tablePlayers = useMemo(() => {
    const ids = (seatOrder && seatOrder.length ? seatOrder : Object.keys(playerNames || {})) || [];

    return ids.map((pid) => {
      const isMe = pid === userId;
      const team = teams?.bid?.includes(pid) ? 'bid' : teams?.oppose?.includes(pid) ? 'oppose' : null;

      // Mendikot: map team_a/team_b to ring colors (bid→A, oppose→B)
      const mendikotTeamClass = isMendikot ? (
        (teams?.A || teams?.bid || []).includes(pid) ? 'team-a' :
        (teams?.B || teams?.oppose || []).includes(pid) ? 'team-b' : null
      ) : null;

      // Judgement bid/tricks status chip
      let jdgStatus = null;
      if (gameType === 'judgement') {
        if (phase === 'bidding') {
          const bid = bidding?.bids?.[pid];
          jdgStatus = bid === undefined
            ? { label: '?? bid', type: 'waiting' }
            : { label: `${bid} bid`,  type: 'placed' };
        } else if (phase === 'playing') {
          const bid = bidding?.bids?.[pid] ?? '?';
          const won = tricksWon?.[pid] || 0;
          const type =
            typeof bid !== 'number' ? 'under' :
            won === bid             ? 'on_target' :
            won >  bid              ? 'over' : 'under';
          jdgStatus = { label: `${won}/${bid}`, type };
        }
      }

      const relation = getRelation(pid);

      const isBidder = gameType === 'kaliteri' && leader === pid &&
        (phase === 'playing' || phase === 'powerhouse' || phase === 'series-finished');

      return {
        id: pid,
        isMe,
        render: () => (
          <PlayerSeat
            name={isMe ? 'You' : getName(pid)}
            avatar={playerAvatars?.[pid] || ''}
            avatarInitial={getName(pid).charAt(0).toUpperCase()}
            isTurn={currentTurn === pid}
            isDealer={dealer === pid}
            isBidder={isBidder}
            team={phase === 'playing' || phase === 'series-finished' ? team : null}
            jdgStatus={jdgStatus}
            relation={relation}
            mendikotTeam={mendikotTeamClass}
          />
        ),
      };
    });
  }, [seatOrder, playerNames, userId, teams, playerAvatars, currentTurn, dealer, phase, gameType, bidding, tricksWon, getRelation, leader, isMendikot]);

  const isMyTurn =
    (phase === 'playing' && Array.isArray(validPlays) && validPlays.length > 0) ||
    (phase === 'band-hukum-pick' && userId === closedTrumpHolderId);
  const activeTrump = isMendikot ? trumpSuitMendikot : (trumpSuit || powerHouseSuit);
  const isSeriesFinished = showSeriesFinished;
  // For mendikot show table during band-hukum-pick phase too
  const showTable = !isSeriesFinished;

  // Clear intended card when it's no longer in hand or phase changes away from playing
  useEffect(() => {
    if (!intendedCard) return;
    if (phase !== 'playing' && phase !== 'band-hukum-pick') { setIntendedCard(null); return; }
    if (!myHand?.some((c) => cardKey(c) === cardKey(intendedCard))) {
      setIntendedCard(null);
    }
  }, [phase, myHand, intendedCard]);

  const handleReturnToLobby = useCallback(() => {
    WsReturnToLobby();
    dispatch(resetGame());
  }, [dispatch]);

  const handleSelectCard = useCallback((card, index) => {
    // During band-hukum-pick, clicking a face-down card emits pick immediately
    if (phase === 'band-hukum-pick' && userId === closedTrumpHolderId) {
      WsPickClosedTrump(index);
      return;
    }
    setIntendedCard(card);
  }, [phase, userId, closedTrumpHolderId]);

  const handlePlayIntended = useCallback(() => {
    if (!intendedCard || !isMyTurn) return;
    if (isCardInList(intendedCard, validPlays)) {
      WsPlayCard(intendedCard);
      hapticSuccess();
      setIntendedCard(null);
    } else {
      hapticWarning();
    }
  }, [intendedCard, isMyTurn, validPlays]);

  // ── Auto-play: play the card after 2 s when it's the only legal move ──
  useEffect(() => {
    if (
      autoplay &&
      phase === 'playing' &&
      currentTurn === userId &&
      Array.isArray(validPlays) &&
      validPlays.length === 1
    ) {
      const timer = setTimeout(() => {
        WsPlayCard(validPlays[0]);
        hapticSuccess();
        setIntendedCard(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoplay, phase, currentTurn, userId, validPlays]);

  const roundText =
    isMendikot
      ? `Rd ${currentRoundNumber || 1}/${totalRounds || 1}`
      : gameType === 'judgement'
      ? `Round ${Number(seriesRoundIndex || 0) + 1}/${totalRoundsInSeries || 1} • Cards ${currentCardsPerRound || 0}`
      : `Round ${currentRound || 0}`;

  const trumpRevealPlayerColor =
    trumpRevealRequestAnnouncement?.playerId && (teams?.A || teams?.bid || []).includes(trumpRevealRequestAnnouncement.playerId)
      ? MENDIKOT_TEAM_A_COLOR
      : trumpRevealRequestAnnouncement?.playerId && (teams?.B || teams?.oppose || []).includes(trumpRevealRequestAnnouncement.playerId)
      ? MENDIKOT_TEAM_B_COLOR
      : null;

  return (
    <View style={styles.wrap}>
      {/* ── Top rows (HUD) ─────────────────────────────────────────────── */}
      {!isSeriesFinished ? (
        isMendikot ? (
          <MendikotHUD
            phase={phase}
            onShowSettings={() => setShowSettings(true)}
            isAdmin={isAdmin}
            onQuit={() => setShowQuitConfirm(true)}
          />
        ) : (
          <TeamScoreHUD
            roundText={roundText}
            trumpText={activeTrump ? `Trump ${suitSymbol(activeTrump)}` : null}
            onShowScoreboard={() => setShowScoreboard(true)}
            onShowSettings={() => setShowSettings(true)}
            isAdmin={isAdmin}
            onQuit={() => setShowQuitConfirm(true)}
            gameType={gameType}
            phase={phase}
            tricks={tricks || []}
            teams={teams || {}}
            leader={leader}
            partnerCards={partnerCards || []}
            getName={getName}
            bidding={bidding}
          />
        )
      ) : null}

      {/* ── Table area — flex: 1 so it fills remaining space ────────── */}
      <View style={styles.tableArea}>
        {showTable ? (
          <CircularTable
            players={tablePlayers}
            tableShape={tableShape}
            centerContent={({ seatPositionMap, tableSize }) => {
              if (phase === 'band-hukum-pick') {
                const isMyPickTurn = userId === closedTrumpHolderId;
                const pickerName = getName(closedTrumpHolderId);
                return (
                  <View style={styles.centerInfo}>
                    <Text style={styles.centerTitle}>
                      {isMyPickTurn ? 'Pick Your Trump' : `Waiting for ${pickerName}`}
                    </Text>
                    <Text style={styles.centerText}>
                      {isMyPickTurn
                        ? 'Tap a face-down card to set as the hidden trump.'
                        : 'to pick the hidden trump'}
                    </Text>
                  </View>
                );
              }

              if (phase === 'trump-announce') {
                return (
                  <TrumpAnnouncePanel
                    trumpSuit={trumpSuit}
                    trumpMode={trumpMode || 'random'}
                    isDealer={dealer === userId}
                  />
                );
              }

              if (phase === 'bidding') {
                if (gameType === 'judgement') {
                  return (
                    <JudgementBiddingPanel
                      bidding={bidding}
                      userId={userId}
                      cardsInRound={currentCardsPerRound || 0}
                      getName={getName}
                      bidCountdownSec={judgementBidCountdown}
                    />
                  );
                }
                return (
                  <BiddingPanel bidding={bidding} userId={userId} getName={getName} />
                );
              }

              if (phase === 'shuffling' || phase === 'dealing') {
                if (phase === 'shuffling') {
                  return (
                    <ShufflingPanel
                      dealer={dealer}
                      userId={userId}
                      shuffleQueue={shuffleQueue || []}
                      getName={getName}
                      currentGameNumber={currentGameNumber || 1}
                      totalGames={totalGames || 1}
                      gameLabel={gameType === 'judgement' ? 'Round' : 'Game'}
                    />
                  );
                }
                const dIdx = seatOrder?.indexOf(dealer) ?? 0;
                return (
                  <DealingOverlay
                    myHand={myHand || []}
                    dealingConfig={dealingConfig}
                    seatOrder={seatOrder || []}
                    dealerIndex={dIdx >= 0 ? dIdx : 0}
                    userId={userId}
                    seatPositionMap={seatPositionMap}
                    tableSize={tableSize}
                  />
                );
              }

              if (phase === 'powerhouse') {
                return (
                  <PowerHouseSelector
                    isLeader={leader === userId}
                    leader={leader}
                    getName={getName}
                    powerHouseSuit={powerHouseSuit}
                    partnerCards={partnerCards || []}
                    myHand={myHand || []}
                    configKey={configKey}
                    partnerCardCount={partnerCardCount}
                  />
                );
              }

              return (
                <View style={styles.centerPlayWrap}>
                  {activeTrump ? (
                    <Text style={[
                      styles.trumpWatermark,
                      (activeTrump === 'H' || activeTrump === 'D') && styles.trumpWatermarkRed,
                    ]}>
                      {suitSymbol(activeTrump)}
                    </Text>
                  ) : null}
                  <PlayArea
                    plays={currentTrick?.plays || []}
                    tricks={tricks || []}
                    seatPositionMap={seatPositionMap}
                    tableSize={tableSize}
                    getName={getName}
                    trumpSuit={activeTrump}
                    tableShape={tableShape}
                  />
                </View>
              );
            }}
          />
        ) : null}

        {isSeriesFinished && !isMendikot ? (
          <SeriesFinishedPanel
            finalRankings={finalRankings || []}
            scores={scores || {}}
            seatOrder={seatOrder || []}
            getName={getName}
            userId={userId}
            playerAvatars={playerAvatars || {}}
            gameType={gameType}
            roundResults={roundResults || []}
            tricksWon={tricksWon || {}}
            bidding={bidding || {}}
            phase={phase}
            onReturnToLobby={handleReturnToLobby}
          />
        ) : null}
      </View>

      {/* ── Hand overlay — absolutely pinned to bottom, sits over the table ── */}
      {showTable && phase !== 'dealing' && !showDealReveal &&
        // During band-hukum-pick only the picker sees their hand
        !(phase === 'band-hukum-pick' && userId !== closedTrumpHolderId) ? (
        <View style={styles.handOverlay} pointerEvents="box-none">
          {/* During band-hukum-pick, no intended slot — tap goes straight to pick */}
          {phase !== 'band-hukum-pick' ? (
            <IntendedCardSlot
              card={intendedCard}
              shouldBounce={isMyTurn && intendedCard && isCardInList(intendedCard, validPlays)}
              onPress={handlePlayIntended}
            />
          ) : null}

          <PlayerHand
            cards={myHand || []}
            validPlays={validPlays || []}
            isMyTurn={isMyTurn}
            onSelectCard={handleSelectCard}
            intendedCard={intendedCard}
          />
        </View>
      ) : null}

      {/* ── Round scoreboard overlay (Judgement only) ── */}
      {showRoundScore ? (
        <View style={styles.roundScoreOverlay}>
          <View style={styles.roundScoreCard}>
            <Text style={styles.roundScoreTitle}>
              {gameType === 'judgement' ? 'Round Complete' : 'Game Complete'}
            </Text>
            <Text style={styles.roundScoreCountdown}>
              Continuing in {roundScoreCountdown}…
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <ScoreTable
                seatOrder={seatOrder || []}
                scores={scores || {}}
                getName={getName}
                gameType={gameType}
                userId={userId}
                roundResults={roundResults || []}
                tricksWon={tricksWon || {}}
                bidding={bidding || {}}
                phase={phase}
                gameHistory={gameHistory || []}
              />
            </ScrollView>
          </View>
        </View>
      ) : null}

      {/* ── Mendikot: closed trump indicator ── */}
      {isMendikot && closedTrumpPlaceholder && phase === 'playing' ? (
        <ClosedTrumpDisplay
          placeholder={closedTrumpPlaceholder}
          revealed={closedTrumpRevealed}
          card={closedTrumpCard}
        />
      ) : null}

      {/* ── Mendikot: reveal trump prompt ── */}
      {isMendikot && pendingTrumpReveal && userId === currentTrick?.currentTurn ? (
        <RevealTrumpPrompt onReveal={() => WsRevealTrump()} />
      ) : null}

      {/* ── Mendikot: end-of-round/series scoreboard ── */}
      {isMendikot && (phase === 'finished' || phase === 'series-finished') ? (
        <View style={styles.mendikotScoreFull}>
          <MendikotScoreBoard
            phase={phase}
            nextRoundReady={nextRoundReady}
          />
        </View>
      ) : null}

      {/* ── Partner reveal announcement ── */}
      {revealAnnouncement ? (
        <RevealAnnouncement
          playerName={revealAnnouncement.playerName}
          bidderName={revealAnnouncement.bidderName}
        />
      ) : null}

      {trumpRevealRequestAnnouncement ? (
        <TrumpRevealRequestAnnouncement
          playerName={trumpRevealRequestAnnouncement.playerName}
          playerColor={trumpRevealPlayerColor}
        />
      ) : null}

      <ScoreboardModal
        visible={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        seatOrder={seatOrder || []}
        scores={scores || {}}
        getName={getName}
        gameType={gameType}
        userId={userId}
        roundResults={roundResults || []}
        tricksWon={tricksWon || {}}
        bidding={bidding || {}}
        phase={phase}
        trumpSuit={trumpSuit}
        gameHistory={gameHistory || []}
      />

      <InGameSettings visible={showSettings} onClose={() => setShowSettings(false)} />

      <Modal
        visible={showQuitConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.quitCard}>
            <Text style={styles.modalTitle}>Quit game?</Text>
            <Text style={styles.modalBody}>This will end the active game for everyone in the room.</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnGhost} onPress={() => setShowQuitConfirm(false)}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalBtnDanger}
                onPress={() => {
                  setShowQuitConfirm(false);
                  WsQuitGame();
                }}
              >
                <Text style={styles.modalDangerText}>Quit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DealRevealOverlay
        visible={showDealReveal}
        cards={myHand || []}
        durationMs={cardRevealTimeMs || 10000}
        onClose={() => setShowDealReveal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  tableArea: {
    flex: 1,
  },
  handOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mendikotScoreFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,15,10,0.93)',
    zIndex: 50,
  },
  centerInfo: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  centerTitle: {
    ...typography.subtitle,
    color: colors.goldLight,
    fontFamily: fonts.heading,
  },
  centerText: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  centerPlayWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trumpWatermark: {
    position: 'absolute',
    fontSize: 264,
    color: colors.cream,
    opacity: 0.07,
    includeFontPadding: false,
  },
  trumpWatermarkRed: {
    color: colors.redSuit,
    opacity: 0.09,
  },
  // ── Intended card slot ────────────────────────────────────────────────────
  intendedSlot: {
    alignItems: 'center',
    marginBottom: 2,
    marginTop: -10,
  },
  intendedArrow: {
    fontSize: 14,
    color: 'rgba(201,162,39,0.5)',
    lineHeight: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  intendedCardWrap: {
    borderRadius: cardTokens.borderRadius + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,39,0.35)',
  },
  intendedEmpty: {
    borderRadius: cardTokens.borderRadius + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,39,0.2)',
    borderStyle: 'dashed',
  },
  intendedPlayable: {
    borderColor: cardTokens.playableBorder,
    borderWidth: 2,
    shadowColor: cardTokens.playableBorder,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },

  // ── Partner reveal announcement toast ────────────────────────────────────
  revealToast: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 35, 20, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.55)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: 'rgba(46, 204, 113, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  revealText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cream,
    textAlign: 'center',
  },
  revealPlayer: {
    color: '#2ecc71',
    fontWeight: '900',
  },
  revealBidder: {
    color: colors.goldLight,
    fontWeight: '900',
  },
  trumpRevealToast: {
    top: '38%',
    borderColor: 'rgba(201,162,39,0.65)',
    shadowColor: 'rgba(201,162,39,0.45)',
  },

  // ── Scoreboard modal ──────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...panelStyle,
    width: '100%',
    maxWidth: 400,
    padding: 0,
    overflow: 'hidden',
    maxHeight: '85%',
  },

  // Header
  sbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
    gap: spacing.xs,
  },
  sbTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  sbClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(201,162,39,0.12)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sbCloseText: {
    color: colors.goldLight,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },

  // ── Quit confirm modal ─────────────────────────────────────────────────────
  quitCard: {
    ...panelStyle,
    width: '100%',
    maxWidth: 340,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalBody: {
    ...typography.caption,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  modalTitle: {
    ...typography.title,
    color: colors.cream,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modalGhostText: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  modalBtnDanger: {
    borderWidth: 1,
    borderColor: colors.redSuit,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modalDangerText: {
    color: colors.redSuit,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },

  // ── Round scoreboard overlay ──────────────────────────────────────────────
  roundScoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 12, 7, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    zIndex: 50,
  },
  roundScoreCard: {
    ...panelStyle,
    width: '100%',
    maxWidth: 400,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  roundScoreTitle: {
    ...typography.subtitle,
    color: colors.goldLight,
    fontFamily: fonts.heading,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roundScoreCountdown: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
