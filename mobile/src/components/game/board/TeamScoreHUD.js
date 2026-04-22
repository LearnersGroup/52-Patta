import { memo, useEffect, useMemo, useState } from 'react';
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
  closeMenuSignal = 0,
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Parent can force-close the scoreboard modal (used before deal-reveal starts).
  useEffect(() => {
    setShowMenu(false);
  }, [closeMenuSignal]);

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

      {/* ── Left: team score ── */}
      <View style={styles.sideLeft}>
        {isKaliteriPlaying ? (
          <View style={styles.scoreStack}>
            <View style={styles.scoreRow}>
              <View style={[styles.teamDot, styles.bidDot]} />
              <View style={styles.scoreRowDivider} />
              <Text style={styles.scoreText}>
                {bidScore}{bidding?.currentBid != null ? `/${bidding.currentBid}` : ''}
              </Text>
            </View>
            <View style={styles.scoreRow}>
              <View style={[styles.teamDot, styles.opposeDot]} />
              <View style={styles.scoreRowDivider} />
              <Text style={styles.scoreText}>
                {opposeScore !== null ? opposeScore : '???'}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Centre: HUD pill — absolutely centred so it never shifts ── */}
      <View style={styles.pillCenter} pointerEvents="box-none">
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
      </View>

      {/* ── Right: partner cards ── */}
      <View style={styles.sideRight}>
        {showPartnerCards ? (
          <PartnerCardDisplay partnerCards={partnerCards} getName={getName} />
        ) : null}
      </View>

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
    alignItems: 'flex-start',
    minHeight: 44,
  },
  sideLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  sideRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  pillCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
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

  // ── Team score stack (Kaliteri) ─────────────────────────────────────────
  scoreStack: {
    flexDirection: 'column',
    gap: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreRowDivider: {
    width: 1,
    height: 13,
    backgroundColor: 'rgba(201,162,39,0.3)',
  },
  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.cream,
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
