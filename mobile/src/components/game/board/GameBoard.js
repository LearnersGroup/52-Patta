import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSelector } from 'react-redux';
import { WsQuitGame } from '../../../api/wsEmitters';
import { colors, fonts, panelStyle, spacing, typography } from '../../../styles/theme';
import PlayerHand from '../PlayerHand';
import { suitSymbol } from '../utils/cardMapper';
import BiddingPanel from './BiddingPanel';
import CircularTable from './CircularTable';
import DealRevealOverlay from './DealRevealOverlay';
import DealingOverlay from './DealingOverlay';
import JudgementBiddingPanel from './JudgementBiddingPanel';
import PartnerCardDisplay from './PartnerCardDisplay';
import PlayArea from './PlayArea';
import PlayerSeat from './PlayerSeat';
import PowerHouseSelector from './PowerHouseSelector';
import SeriesFinishedPanel from './SeriesFinishedPanel';
import ShufflingPanel from './ShufflingPanel';
import TeamScoreHUD from './TeamScoreHUD';
import TrumpAnnouncePanel from './TrumpAnnouncePanel';

const RND_CELL_W  = 46;   // wide enough for "Total" in Cinzel without wrapping
const MIN_COL_W   = 76;   // minimum player column — wider than a typical name at 10 px

function ScoreboardModal({ visible, onClose, seatOrder, scores, getName, gameType, roundResults, tricksWon, bidding, phase }) {
  const { width: screenW } = useWindowDimensions();

  // ── Sort players by total score, highest first ──────────────────────────
  const players = useMemo(() => {
    const base = seatOrder || [];
    return [...base].sort((a, b) => (scores?.[b] || 0) - (scores?.[a] || 0));
  }, [seatOrder, scores]);

  // ── Column-width logic ───────────────────────────────────────────────────
  // Modal inner width = min(400, screenW - 32)  (32 = backdrop padding * 2)
  const modalInnerW   = Math.min(400, screenW - 32);
  const availForCols  = modalInnerW - RND_CELL_W;
  const naturalColW   = players.length > 0 ? availForCols / players.length : availForCols;
  // If natural width is at least MIN_COL_W, divide evenly (no scroll needed).
  // Otherwise clamp to MIN_COL_W and let the horizontal ScrollView handle overflow.
  const colW          = Math.max(MIN_COL_W, naturalColW);
  const needsHScroll  = colW * players.length > availForCols;

  // Helper to render a single row of player cells
  const renderPlayerCells = (cellFn) =>
    players.map((pid) => (
      <View key={pid} style={[styles.sbPlayerCell, { width: colW }]}>
        {cellFn(pid)}
      </View>
    ));

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

          {/* ── Judgement table ──────────────────────────────────────── */}
          {gameType === 'judgement' ? (() => {
            const tableContent = (
              <View>
                {/* Column headers */}
                <View style={styles.sbRow}>
                  <View style={styles.sbRndCell}>
                    <Text style={styles.sbColHead}>#</Text>
                  </View>
                  {renderPlayerCells((pid) => (
                    <Text style={styles.sbColHead} numberOfLines={1}>{getName(pid)}</Text>
                  ))}
                </View>

                {/* Round rows */}
                <ScrollView style={styles.sbScroll}>
                  {(roundResults || []).map((rr, idx) => (
                    <View
                      key={`r-${rr?.roundNumber}`}
                      style={[styles.sbRow, idx % 2 === 0 && styles.sbRowAlt]}
                    >
                      <View style={styles.sbRndCell}>
                        <Text style={styles.sbRndNum}>{rr?.roundNumber}</Text>
                      </View>
                      {renderPlayerCells((pid) => {
                        const won   = rr?.tricksWon?.[pid] ?? 0;
                        const bid   = rr?.bids?.[pid]      ?? 0;
                        const delta = rr?.deltas?.[pid]    ?? 0;
                        const hit   = delta > 0;
                        return (
                          <>
                            <Text style={styles.sbWonBid}>{won}/{bid}</Text>
                            <Text style={[styles.sbDelta, hit ? styles.sbDeltaHit : styles.sbDeltaMiss]}>
                              {hit ? `+${delta}` : '✗'}
                            </Text>
                          </>
                        );
                      })}
                    </View>
                  ))}

                  {/* Live row */}
                  {phase === 'playing' ? (
                    <View style={[styles.sbRow, styles.sbRowLive]}>
                      <View style={styles.sbRndCell}>
                        <Text style={styles.sbLiveLabel}>Now</Text>
                      </View>
                      {renderPlayerCells((pid) => (
                        <Text style={styles.sbWonBid}>
                          {tricksWon?.[pid] || 0}/{bidding?.bids?.[pid] ?? '?'}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>

                {/* Totals footer */}
                <View style={[styles.sbRow, styles.sbRowTotal]}>
                  <View style={styles.sbRndCell}>
                    <Text style={styles.sbTotalLabel} numberOfLines={1}>Total</Text>
                  </View>
                  {renderPlayerCells((pid) => (
                    <Text style={styles.sbTotalValue}>{scores?.[pid] || 0}</Text>
                  ))}
                </View>
              </View>
            );

            return needsHScroll ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {tableContent}
              </ScrollView>
            ) : tableContent;
          })() : (

            /* ── Non-judgement (Kaliteri) ──────────────────────────── */
            <ScrollView style={styles.sbScroll}>
              {players.map((pid, idx) => (
                <View key={pid} style={[styles.sbKalRow, idx % 2 === 0 && styles.sbRowAlt]}>
                  <Text style={styles.sbKalName} numberOfLines={1}>{getName(pid)}</Text>
                  <Text style={styles.sbKalScore}>{scores?.[pid] || 0}</Text>
                </View>
              ))}
            </ScrollView>
          )}

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

  useEffect(() => {
    const prev = prevPhaseRef.current;

    if (prev === 'dealing' && phase === 'bidding' && Array.isArray(myHand) && myHand.length > 0) {
      setShowDealReveal(true);
    }

    if (phase === 'lobby' || phase === null || phase === 'shuffling') {
      setShowDealReveal(false);
    }

    prevPhaseRef.current = phase;
  }, [phase, myHand]);

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
            team={phase === 'playing' || phase === 'series-finished' ? team : null}
            jdgStatus={jdgStatus}
          />
        ),
      };
    });
  }, [seatOrder, playerNames, userId, teams, playerAvatars, currentTurn, dealer, phase, gameType, bidding, tricksWon]);

  const isMyTurn = phase === 'playing' && Array.isArray(validPlays) && validPlays.length > 0;
  const activeTrump = trumpSuit || powerHouseSuit;
  const isSeriesFinished = phase === 'series-finished';
  const showTable = !isSeriesFinished;

  const roundText =
    gameType === 'judgement'
      ? `Round ${Number(seriesRoundIndex || 0) + 1}/${totalRoundsInSeries || 1} • Cards ${currentCardsPerRound || 0}`
      : `Round ${currentRound || 0}`;

  return (
    <View style={styles.wrap}>
      {/* ── Top row ─────────────────────────────────────────────────── */}
      {!isSeriesFinished ? (
        <TeamScoreHUD
          roundText={roundText}
          trumpText={activeTrump ? `Trump ${suitSymbol(activeTrump)}` : null}
          onShowScoreboard={() => setShowScoreboard(true)}
          isAdmin={isAdmin}
          onQuit={() => setShowQuitConfirm(true)}
        />
      ) : null}

      {showTable && gameType === 'kaliteri' && (phase === 'playing' || phase === 'powerhouse') ? (
        <PartnerCardDisplay partnerCards={partnerCards || []} powerHouseSuit={powerHouseSuit} getName={getName} />
      ) : null}

      {/* ── Table area — flex: 1 so it fills remaining space ────────── */}
      <View style={styles.tableArea}>
        {showTable ? (
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
                const bidder = bidding?.currentBidder;
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
                  />
                </View>
              );
            }}
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
      </View>

      {/* ── Hand overlay — absolutely pinned to bottom, sits over the table ── */}
      {showTable && phase !== 'dealing' ? (
        <View style={styles.handOverlay} pointerEvents="box-none">
          {phase === 'bidding' && !showDealReveal && gameType !== 'judgement' ? (
            <BiddingPanel bidding={bidding} userId={userId} getName={getName} />
          ) : null}
          <PlayerHand cards={myHand || []} validPlays={validPlays || []} isMyTurn={isMyTurn} />
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
    fontSize: 88,
    color: colors.cream,
    opacity: 0.07,
    includeFontPadding: false,
  },
  trumpWatermarkRed: {
    color: colors.redSuit,
    opacity: 0.09,
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

  // Table rows
  sbScroll: {
    maxHeight: 280,
  },
  sbRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  sbRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  sbRowLive: {
    backgroundColor: 'rgba(201,162,39,0.06)',
  },
  sbRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    backgroundColor: 'rgba(201,162,39,0.07)',
  },

  // Cells
  sbRndCell: {
    width: RND_CELL_W,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(201,162,39,0.2)',
  },
  sbPlayerCell: {
    flex: 1,                    // stretches to fill remaining row width
    minWidth: 56,               // prevents crushing on narrow screens
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(201,162,39,0.12)',
  },

  // Cell text
  sbColHead: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  sbRndNum: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.creamMuted,
    textAlign: 'center',
  },
  sbWonBid: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sbDelta: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },
  sbDeltaHit: {
    color: colors.readyLight,
  },
  sbDeltaMiss: {
    color: colors.redSuit,
  },
  sbLiveLabel: {
    fontFamily: fonts.heading,
    fontSize: 9,
    color: colors.goldLight,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sbTotalLabel: {
    fontFamily: fonts.heading,
    fontSize: 9,
    color: colors.goldLight,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sbTotalValue: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
  },

  // Kaliteri rows
  sbKalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  sbKalName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.cream,
    flex: 1,
    marginRight: spacing.sm,
  },
  sbKalScore: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
    minWidth: 40,
    textAlign: 'right',
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
});
