import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { WsNextRound, WsQuitGame } from '../../../api/wsEmitters';
import { colors, fonts, panelStyle, shadows, spacing, typography } from '../../../styles/theme';
import PlayerHand from '../PlayerHand';
import { suitSymbol } from '../utils/cardMapper';
import BiddingPanel from './BiddingPanel';
import CircularTable from './CircularTable';
import DealRevealOverlay from './DealRevealOverlay';
import DealingOverlay from './DealingOverlay';
import JudgementBiddingPanel from './JudgementBiddingPanel';
import JudgementScoreBoard from './JudgementScoreBoard';
import KaliteriScoreBoard from './KaliteriScoreBoard';
import PartnerCardDisplay from './PartnerCardDisplay';
import PlayArea from './PlayArea';
import PlayerSeat from './PlayerSeat';
import PowerHouseSelector from './PowerHouseSelector';
import SeriesFinishedPanel from './SeriesFinishedPanel';
import ShufflingPanel from './ShufflingPanel';
import TeamScoreHUD from './TeamScoreHUD';
import TrumpAnnouncePanel from './TrumpAnnouncePanel';

function ScoreboardModal({ visible, onClose, seatOrder, scores, getName, gameType, roundResults, tricksWon, bidding, phase, trumpSuit }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Scoreboard</Text>
          {gameType === 'judgement' ? (
            <>
              {trumpSuit ? <Text style={styles.modalSub}>Trump {suitSymbol(trumpSuit)}</Text> : null}
              <ScrollView horizontal>
                <View>
                  <View style={styles.jdgRowHead}>
                    <Text style={[styles.jdgCellHead, styles.jdgRoundCol]}>Rnd</Text>
                    {(seatOrder || []).map((pid) => (
                      <Text key={`h-${pid}`} style={[styles.jdgCellHead, styles.jdgPlayerCol]}>{getName(pid)}</Text>
                    ))}
                  </View>

                  <ScrollView style={styles.modalScroll}>
                    {(roundResults || []).map((rr) => (
                      <View key={`r-${rr?.roundNumber}`} style={styles.jdgRow}>
                        <Text style={[styles.jdgCell, styles.jdgRoundCol]}>{rr?.roundNumber}</Text>
                        {(seatOrder || []).map((pid) => (
                          <View key={`c-${rr?.roundNumber}-${pid}`} style={[styles.jdgCell, styles.jdgPlayerCol]}>
                            <Text style={styles.jdgWonBid}>{rr?.tricksWon?.[pid] ?? 0}/{rr?.bids?.[pid] ?? 0}</Text>
                            <Text style={styles.jdgDelta}>{(rr?.deltas?.[pid] ?? 0) > 0 ? `+${rr?.deltas?.[pid]}` : '✗'}</Text>
                          </View>
                        ))}
                      </View>
                    ))}

                    {phase === 'playing' ? (
                      <View style={styles.jdgRow}>
                        <Text style={[styles.jdgCell, styles.jdgRoundCol]}>Live</Text>
                        {(seatOrder || []).map((pid) => (
                          <View key={`live-${pid}`} style={[styles.jdgCell, styles.jdgPlayerCol]}>
                            <Text style={styles.jdgWonBid}>{tricksWon?.[pid] || 0}/{bidding?.bids?.[pid] ?? '?'}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.jdgRowHead}>
                      <Text style={[styles.jdgCellHead, styles.jdgRoundCol]}>Total</Text>
                      {(seatOrder || []).map((pid) => (
                        <Text key={`t-${pid}`} style={[styles.jdgCellHead, styles.jdgPlayerCol]}>{scores?.[pid] || 0}</Text>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </ScrollView>
            </>
          ) : (
            <ScrollView style={styles.modalScroll}>
              {(seatOrder || []).map((pid) => (
                <View style={styles.modalRow} key={pid}>
                  <Text style={styles.modalName}>{getName(pid)}</Text>
                  <Text style={styles.modalValue}>{scores?.[pid] || 0}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function GameBoard({ userId, isAdmin = false }) {
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
  const scoringResult = useSelector((state) => state.game.scoringResult);
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

  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showDealReveal, setShowDealReveal] = useState(false);
  const [judgementBidCountdown, setJudgementBidCountdown] = useState(null);
  const prevPhaseRef = useRef(phase);
  const phaseFade = useSharedValue(1);

  useEffect(() => {
    const prev = prevPhaseRef.current;

    if (prev !== phase) {
      phaseFade.value = 0.86;
      phaseFade.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    }

    if (prev === 'dealing' && phase === 'bidding' && Array.isArray(myHand) && myHand.length > 0) {
      setShowDealReveal(true);
    }

    if (phase === 'lobby' || phase === null || phase === 'shuffling') {
      setShowDealReveal(false);
    }

    prevPhaseRef.current = phase;
  }, [phase, myHand]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: phaseFade.value,
    transform: [{ scale: 0.99 + (0.01 * phaseFade.value) }],
  }));

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

  const getName = (pid) => playerNames?.[pid] || pid?.slice?.(0, 8) || 'Player';

  const currentTurn = useMemo(() => {
    if (phase === 'bidding') {
      if (gameType === 'judgement') {
        return bidding?.bidOrder?.[bidding?.currentBidderIndex] || null;
      }
      return bidding?.currentBidder || null;
    }
    if (phase === 'playing') return currentTrick?.currentTurn || null;
    if (phase === 'powerhouse') return leader || null;
    if (phase === 'shuffling' || phase === 'dealing') return dealer || null;
    return null;
  }, [phase, gameType, bidding, currentTrick, leader, dealer]);

  const tablePlayers = useMemo(() => {
    const ids = (seatOrder && seatOrder.length ? seatOrder : Object.keys(playerNames || {})) || [];

    return ids.map((pid) => {
      const isMe = pid === userId;
      const team = teams?.bid?.includes(pid) ? 'bid' : teams?.oppose?.includes(pid) ? 'oppose' : null;

      return {
        id: pid,
        isMe,
        render: () => (
          <PlayerSeat
            name={isMe ? 'You' : getName(pid)}
            avatar={playerAvatars?.[pid] || ''}
            avatarInitial={getName(pid).charAt(0).toUpperCase()}
            cardCount={isMe ? (myHand?.length || 0) : (handSizes?.[pid] || 0)}
            isTurn={currentTurn === pid}
            isDealer={dealer === pid}
            team={phase === 'playing' || phase === 'finished' || phase === 'series-finished' ? team : null}
            tricksWon={gameType === 'judgement' ? tricksWon?.[pid] : null}
          />
        ),
      };
    });
  }, [seatOrder, playerNames, userId, teams, playerAvatars, myHand, handSizes, currentTurn, dealer, phase, gameType, tricksWon]);

  const isMyTurn = phase === 'playing' && Array.isArray(validPlays) && validPlays.length > 0;
  const activeTrump = trumpSuit || powerHouseSuit;
  const isScorePhase = phase === 'finished' || phase === 'scoring';
  const isSeriesFinished = phase === 'series-finished';
  const showTable = !isScorePhase && !isSeriesFinished;

  const roundText =
    gameType === 'judgement'
      ? `Round ${Number(seriesRoundIndex || 0) + 1}/${totalRoundsInSeries || 1} • Cards ${currentCardsPerRound || 0}`
      : `Round ${currentRound || 0}`;

  const phaseLabel = phase || 'lobby';

  return (
    <View style={styles.wrap}>
      {!isSeriesFinished ? (
        <TeamScoreHUD
          gameType={gameType}
          phase={phaseLabel}
          teams={teams}
          tricks={tricks}
          leader={leader}
          scores={scores}
          roundText={roundText}
          trumpText={activeTrump ? `Trump ${suitSymbol(activeTrump)}` : null}
          onShowScoreboard={() => setShowScoreboard(true)}
        />
      ) : null}

      {showTable && gameType === 'kaliteri' && (phase === 'playing' || phase === 'powerhouse') ? (
        <PartnerCardDisplay partnerCards={partnerCards || []} powerHouseSuit={powerHouseSuit} getName={getName} />
      ) : null}

      {showTable ? (
        <Animated.View style={[styles.tableCard, fadeStyle]}>
          <CircularTable
            players={tablePlayers}
            centerContent={({ seatPositionMap, tableSize }) => {
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
                const bidder = gameType === 'judgement'
                  ? bidding?.bidOrder?.[bidding?.currentBidderIndex]
                  : bidding?.currentBidder;
                const currentBid = bidding?.currentBid;

                return (
                  <View style={styles.centerInfo}>
                    <Text style={styles.centerTitle}>Bidding</Text>
                    <Text style={styles.centerText}>Turn: {bidder ? getName(bidder) : '—'}</Text>
                    {typeof currentBid === 'number' ? (
                      <Text style={styles.centerText}>Current bid: {currentBid}</Text>
                    ) : null}
                  </View>
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

                return <DealingOverlay myHand={myHand || []} dealingConfig={dealingConfig} />;
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
                <PlayArea
                  plays={currentTrick?.plays || []}
                  tricks={tricks || []}
                  seatPositionMap={seatPositionMap}
                  tableSize={tableSize}
                  getName={getName}
                  trumpSuit={activeTrump}
                />
              );
            }}
          />
        </Animated.View>
      ) : null}

      {showTable && phase !== 'dealing' ? <PlayerHand cards={myHand || []} validPlays={validPlays || []} isMyTurn={isMyTurn} /> : null}

      {showTable && phase === 'bidding' && !showDealReveal && gameType === 'judgement' ? (
        <JudgementBiddingPanel
          bidding={bidding}
          userId={userId}
          cardsInRound={currentCardsPerRound || 0}
          getName={getName}
          bidCountdownSec={judgementBidCountdown}
        />
      ) : null}

      {showTable && phase === 'bidding' && !showDealReveal && gameType !== 'judgement' ? (
        <BiddingPanel bidding={bidding} userId={userId} getName={getName} />
      ) : null}

      {isScorePhase && gameType === 'judgement' ? (
        <JudgementScoreBoard
          seatOrder={seatOrder || []}
          roundResults={roundResults || []}
          scores={scores || {}}
          getName={getName}
          trumpCard={trumpCard}
          trumpSuit={trumpSuit}
          nextRoundReady={nextRoundReady}
          userId={userId}
          scoreboardTimeMs={scoreboardTimeMs || 5000}
          seriesRoundIndex={seriesRoundIndex || 0}
          totalRoundsInSeries={totalRoundsInSeries || 1}
          phase={phase}
          tricksWon={tricksWon || {}}
          bidding={bidding || {}}
        />
      ) : null}

      {isScorePhase && gameType !== 'judgement' ? (
        <KaliteriScoreBoard
          scores={scores || {}}
          teams={teams || { bid: [], oppose: [] }}
          tricks={tricks || []}
          scoringResult={scoringResult}
          seatOrder={seatOrder || []}
          getName={getName}
          nextRoundReady={nextRoundReady}
          userId={userId}
          currentGameNumber={currentGameNumber || 1}
          totalGames={totalGames || 1}
          onNextRound={WsNextRound}
        />
      ) : null}

      {isSeriesFinished ? (
        <SeriesFinishedPanel
          finalRankings={finalRankings || []}
          scores={scores || {}}
          seatOrder={seatOrder || []}
          getName={getName}
          userId={userId}
        />
      ) : null}

      {showTable ? (
        <View style={styles.footerActions}>
          {isAdmin ? (
            <Pressable style={styles.dangerBtn} onPress={() => setShowQuitConfirm(true)}>
              <Text style={styles.dangerBtnText}>Quit Game</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScoreboardModal
        visible={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        seatOrder={seatOrder || []}
        scores={scores || {}}
        getName={getName}
        gameType={gameType}
        roundResults={roundResults || []}
        tricksWon={tricksWon || {}}
        bidding={bidding || {}}
        phase={phase}
        trumpSuit={trumpSuit}
      />

      <Modal
        visible={showQuitConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuitConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
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
    gap: spacing.md,
  },
  tableCard: {
    ...panelStyle,
    paddingVertical: spacing.md,
    overflow: 'hidden',
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
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    ...shadows.shallow,
  },
  secondaryBtnText: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dangerBtn: {
    borderWidth: 1,
    borderColor: colors.redSuit,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    ...shadows.shallow,
  },
  dangerBtnText: {
    color: colors.redSuit,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    ...panelStyle,
    width: '100%',
    maxWidth: 360,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.title,
    color: colors.cream,
  },
  modalSub: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalBody: {
    ...typography.caption,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  modalScroll: {
    maxHeight: 260,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
  },
  modalName: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  modalValue: {
    color: colors.gold,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 16,
  },
  jdgRowHead: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
  },
  jdgRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
  },
  jdgRoundCol: {
    width: 48,
  },
  jdgPlayerCol: {
    width: 72,
    textAlign: 'center',
  },
  jdgCellHead: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  jdgCell: {
    color: colors.cream,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jdgWonBid: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  jdgDelta: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBtn: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modalBtnText: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
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
});
