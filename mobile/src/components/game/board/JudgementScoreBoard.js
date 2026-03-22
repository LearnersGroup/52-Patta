import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WsNextRound } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, modalOverlayStyle, panelStyle, pillStyle, spacing, typography } from '../../../styles/theme';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

function JudgementScoreHistoryModal({ visible, onClose, seatOrder = [], roundResults = [], scores = {}, getName, trumpSuit, phase, tricksWon = {}, bidding = {} }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCardLarge}>
          <View style={styles.modalHeadRow}>
            <Text style={styles.modalTitle}>Judgement Scoreboard</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {trumpSuit ? (
            <Text style={[styles.trumpText, isRedSuit(trumpSuit) ? styles.red : styles.black]}>
              {suitSymbol(trumpSuit)} Trump
            </Text>
          ) : null}

          <ScrollView horizontal>
            <View>
              <View style={styles.tableRowHead}>
                <Text style={[styles.cellHead, styles.roundCol]}>Rnd</Text>
                {seatOrder.map((pid) => (
                  <Text key={`h-${pid}`} style={[styles.cellHead, styles.playerCol]}>
                    {getName(pid)}
                  </Text>
                ))}
              </View>

              <ScrollView style={{ maxHeight: 260 }}>
                {roundResults.map((rr) => {
                  const hasHit = seatOrder.some((pid) => (rr?.bids?.[pid] ?? 0) === (rr?.tricksWon?.[pid] ?? 0));
                  return (
                    <View key={`r-${rr?.roundNumber}`} style={styles.tableRow}>
                      <Text style={[styles.cell, styles.roundCol]}>{rr?.roundNumber}</Text>
                      {seatOrder.map((pid) => {
                        const bid = rr?.bids?.[pid] ?? 0;
                        const won = rr?.tricksWon?.[pid] ?? 0;
                        const delta = rr?.deltas?.[pid] ?? 0;
                        const hit = bid === won;
                        return (
                          <View key={`c-${rr?.roundNumber}-${pid}`} style={[styles.cellContainer, styles.playerCol, hit ? styles.hitRow : styles.missRow]}>
                            <Text style={styles.wonBid}>{won}/{bid}</Text>
                            <Text style={[styles.deltaText, hit ? styles.success : styles.fail]}>{delta > 0 ? `+${delta}` : '✗'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

                {phase === 'playing' ? (
                  <View style={[styles.tableRow, styles.liveRow]}>
                    <Text style={[styles.cell, styles.roundCol]}>Live</Text>
                    {seatOrder.map((pid) => (
                      <View key={`live-${pid}`} style={[styles.cellContainer, styles.playerCol]}>
                        <Text style={styles.wonBid}>{tricksWon?.[pid] || 0}/{bidding?.bids?.[pid] ?? '?'}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.tableRowHead}>
                  <Text style={[styles.cellHead, styles.roundCol]}>Total</Text>
                  {seatOrder.map((pid) => (
                    <Text key={`t-${pid}`} style={[styles.cellHead, styles.playerCol]}>{scores?.[pid] || 0}</Text>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function JudgementScoreBoard({
  seatOrder = [],
  roundResults = [],
  scores = {},
  getName,
  trumpCard,
  trumpSuit,
  nextRoundReady = { readyPlayers: [], totalPlayers: 0 },
  userId,
  scoreboardTimeMs = 5000,
  seriesRoundIndex = 0,
  totalRoundsInSeries = 1,
  phase,
  tricksWon = {},
  bidding = {},
}) {
  const seconds = Math.max(1, Math.round((scoreboardTimeMs || 5000) / 1000));
  const [countdown, setCountdown] = useState(seconds);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setCountdown(seconds);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, seriesRoundIndex]);

  const readyPlayers = nextRoundReady?.readyPlayers || [];
  const totalPlayers = nextRoundReady?.totalPlayers || seatOrder.length || 0;
  const isReady = !!userId && readyPlayers.includes(userId);
  const displaySuit = trumpCard?.suit || trumpSuit;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Round {seriesRoundIndex + 1} of {totalRoundsInSeries}</Text>
        {displaySuit ? (
          <Text style={[styles.trumpText, isRedSuit(displaySuit) ? styles.red : styles.black]}>
            {suitSymbol(displaySuit)} Trump
          </Text>
        ) : null}
      </View>

      <ScrollView horizontal>
        <View>
          <View style={styles.tableRowHead}>
            <Text style={[styles.cellHead, styles.roundCol]}>Rnd</Text>
            {seatOrder.map((pid) => (
              <Text key={`head-${pid}`} style={[styles.cellHead, styles.playerCol]}>{getName(pid)}</Text>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 180 }}>
            {roundResults.map((rr) => (
              <View key={`mini-${rr?.roundNumber}`} style={styles.tableRow}>
                <Text style={[styles.cell, styles.roundCol]}>{rr?.roundNumber}</Text>
                {seatOrder.map((pid) => {
                  const bid = rr?.bids?.[pid] ?? 0;
                  const won = rr?.tricksWon?.[pid] ?? 0;
                  const delta = rr?.deltas?.[pid] ?? 0;
                  const hit = bid === won;
                  return (
                    <View key={`mini-${rr?.roundNumber}-${pid}`} style={[styles.cellContainer, styles.playerCol, hit ? styles.hitRow : styles.missRow]}>
                      <Text style={styles.wonBid}>{won}/{bid}</Text>
                      <Text style={[styles.deltaText, hit ? styles.success : styles.fail]}>{delta > 0 ? `+${delta}` : '✗'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={styles.tableRowHead}>
              <Text style={[styles.cellHead, styles.roundCol]}>Total</Text>
              {seatOrder.map((pid) => (
                <Text key={`sum-${pid}`} style={[styles.cellHead, styles.playerCol]}>{scores?.[pid] || 0}</Text>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryBtn} onPress={() => setShowHistory(true)}>
          <Text style={styles.secondaryBtnText}>Open Full Scoreboard</Text>
        </Pressable>

        <Pressable style={[styles.readyBtn, isReady && styles.readyBtnDone]} onPress={WsNextRound} disabled={isReady}>
          <Text style={styles.readyBtnText}>{isReady ? 'Ready ✓' : 'Ready for Next Round'}</Text>
        </Pressable>
      </View>

      <Text style={styles.readyLabel}>Ready: {readyPlayers.length}/{totalPlayers}</Text>
      <View style={styles.countdownPill}>
        <Text style={styles.countdownText}>Next round in {countdown}s...</Text>
      </View>

      <JudgementScoreHistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        seatOrder={seatOrder}
        roundResults={roundResults}
        scores={scores}
        getName={getName}
        trumpSuit={displaySuit}
        phase={phase}
        tricksWon={tricksWon}
        bidding={bidding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.cream,
    fontSize: 16,
  },
  trumpText: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  red: {
    color: colors.redSuit,
  },
  black: {
    color: colors.cream,
  },
  tableRowHead: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
  },
  liveRow: {
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
  },
  hitRow: {
    backgroundColor: 'rgba(46, 204, 113, 0.06)',
  },
  missRow: {
    backgroundColor: 'rgba(204, 41, 54, 0.06)',
  },
  roundCol: {
    width: 48,
  },
  playerCol: {
    width: 74,
    textAlign: 'center',
  },
  cellHead: {
    fontFamily: fonts.heading,
    color: colors.creamMuted,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cell: {
    fontFamily: fonts.body,
    color: colors.cream,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  cellContainer: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wonBid: {
    fontFamily: fonts.body,
    color: colors.cream,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  deltaText: {
    fontFamily: fonts.heading,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  success: {
    color: '#2ecc71',
  },
  fail: {
    color: '#cc2936',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.small,
  },
  secondaryBtnText: {
    ...buttonStyles.secondaryText,
    ...buttonStyles.smallText,
  },
  readyBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    ...buttonStyles.small,
  },
  readyBtnDone: {
    opacity: 0.6,
  },
  readyBtnText: {
    ...buttonStyles.primaryText,
    ...buttonStyles.smallText,
  },
  readyLabel: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  countdownPill: {
    ...pillStyle,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    ...modalOverlayStyle,
    padding: spacing.lg,
  },
  modalCardLarge: {
    ...panelStyle,
    width: '100%',
    maxWidth: 380,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: '85%',
  },
  modalHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.title,
    color: colors.cream,
    fontSize: 16,
  },
  closeBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.small,
  },
  closeBtnText: {
    ...buttonStyles.secondaryText,
  },
});
