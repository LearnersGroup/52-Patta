import { memo, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, panelStyle, spacing } from '../../../styles/theme';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';
import PartnerCardDisplay from './PartnerCardDisplay';
import ScoreTable from './ScoreTable';

// ── Judgement menu modal (scoreboard + end button) ────────────────────────

const JudgementMenuModal = memo(function JudgementMenuModal({
  visible, onClose, isAdmin, onEnd,
  seatOrder, scores, getName, gameType, userId,
  roundResults, tricksWon, bidding, phase, gameHistory,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={menuStyles.backdrop} onPress={onClose}>
        <Pressable style={menuStyles.card} onPress={() => {}}>

          <View style={menuStyles.header}>
            {isAdmin ? (
              <Pressable
                style={menuStyles.endBtn}
                onPress={() => { onClose(); onEnd(); }}
                hitSlop={6}
              >
                <Text style={menuStyles.endBtnText}>END</Text>
              </Pressable>
            ) : (
              <View style={menuStyles.headerSide} />
            )}

            <Text style={menuStyles.title}>SCOREBOARD</Text>

            <View style={menuStyles.headerSide}>
              <Pressable style={menuStyles.closeBtn} onPress={onClose} hitSlop={10}>
                <Text style={menuStyles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>

          <View style={menuStyles.divider} />

          <ScrollView
            style={menuStyles.scroll}
            contentContainerStyle={menuStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
});

// ── Main HUD ──────────────────────────────────────────────────────────────

export default function TeamScoreHUD({
  trumpSuit,
  roundText,
  onShowSettings,
  isAdmin = false,
  onQuit,
  // Kaliteri team score props
  gameType,
  phase,
  tricks = [],
  teams = {},
  leader,
  partnerCards = [],
  getName,
  bidding,
  // Scoreboard props
  seatOrder = [],
  scores = {},
  userId,
  roundResults = [],
  tricksWon = {},
  gameHistory = [],
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isKaliteriPlaying = gameType === 'kaliteri' && (phase === 'playing' || phase === 'powerhouse');

  const playerTrickPoints = useMemo(() => {
    const pts = {};
    (tricks || []).forEach((t) => {
      if (t.winner) pts[t.winner] = (pts[t.winner] || 0) + (t.points || 0);
    });
    return pts;
  }, [tricks]);

  const allRevealed = partnerCards.length > 0 && partnerCards.every((pc) => pc.revealed);

  const bidScore = allRevealed
    ? (teams.bid || []).reduce((sum, pid) => sum + (playerTrickPoints[pid] || 0), 0)
    : playerTrickPoints[leader] || 0;

  const opposeScore = allRevealed
    ? (teams.oppose || []).reduce((sum, pid) => sum + (playerTrickPoints[pid] || 0), 0)
    : null;

  const showPartnerCards = isKaliteriPlaying && partnerCards.length > 0;

  return (
    <View style={styles.outerRow}>
      <View style={styles.leftCol}>

        {/* ── Integrated HUD pill ── */}
        <View style={styles.pill}>
          {trumpSuit ? (
            <View style={styles.trumpChip}>
              <Text style={[styles.trumpSymbol, isRedSuit(trumpSuit) && styles.trumpRed]}>
                {suitSymbol(trumpSuit)}
              </Text>
            </View>
          ) : null}

          {trumpSuit ? <View style={styles.divider} /> : null}

          <Pressable style={styles.menuZone} onPress={() => setShowMenu(true)}>
            {roundText ? <Text style={styles.roundText}>{roundText}</Text> : null}
            <Text style={styles.iconText}>☰</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.iconBtn} onPress={onShowSettings} hitSlop={8}>
            <Text style={styles.iconText}>⚙</Text>
          </Pressable>
        </View>

        {/* ── Team scores (Kaliteri only during play) ── */}
        {isKaliteriPlaying ? (
          <View style={styles.scoreRow}>
            <View style={styles.teamScore}>
              <View style={[styles.teamDot, styles.bidDot]} />
              <Text style={styles.scoreText}>{bidScore}</Text>
            </View>
            {bidding?.currentBid != null ? (
              <Text style={styles.bidLabel}>/ {bidding.currentBid}</Text>
            ) : null}
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.teamScore}>
              <View style={[styles.teamDot, styles.opposeDot]} />
              <Text style={styles.scoreText}>
                {opposeScore !== null ? opposeScore : '???'}
              </Text>
            </View>
          </View>
        ) : null}

      </View>

      {/* ── Partner cards (Kaliteri) ── */}
      {showPartnerCards ? (
        <View style={styles.rightCol}>
          <PartnerCardDisplay partnerCards={partnerCards} getName={getName} />
        </View>
      ) : null}

      <JudgementMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        isAdmin={isAdmin}
        onEnd={onQuit}
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
  );
}

const styles = StyleSheet.create({
  outerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    marginTop: -10,
  },
  leftCol: {
    flex: 1,
    gap: 2,
  },
  rightCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: spacing.xs,
  },

  // ── Integrated pill (matches MendikotHUD pill) ──────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 42, 25, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.28)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 5,
    alignSelf: 'center',
  },
  trumpChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trumpSymbol: {
    fontSize: 15,
    color: colors.cream,
    fontFamily: fonts.body,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  trumpRed: {
    color: colors.redSuit,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(201,162,39,0.3)',
    marginHorizontal: 2,
  },
  roundText: {
    fontSize: 11,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  menuZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 3,
  },
  iconBtn: {
    paddingHorizontal: 3,
  },
  iconText: {
    fontSize: 14,
    color: colors.gold,
    lineHeight: 16,
  },

  // ── Team score row (Kaliteri) ───────────────────────────────────────────
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 2,
  },
  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bidDot: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  opposeDot: {
    backgroundColor: colors.redSuit,
    shadowColor: colors.redSuit,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    fontWeight: '700',
    color: colors.cream,
  },
  bidLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    fontWeight: '700',
    color: colors.goldLight,
    opacity: 0.7,
  },
  vsText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.creamMuted,
    fontStyle: 'italic',
  },
});

// ── Menu modal styles (matches MendikotHUD menuStyles) ────────────────────

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    ...panelStyle,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  headerSide: {
    width: 52,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  endBtn: {
    width: 52,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.redSuit + 'aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    fontFamily: fonts.heading,
    fontSize: 11,
    fontWeight: '700',
    color: colors.redSuit,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(201,162,39,0.10)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.goldLight,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderGold,
    marginHorizontal: spacing.sm,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
});
