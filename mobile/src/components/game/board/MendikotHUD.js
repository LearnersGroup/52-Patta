import { memo, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { cardTokens, colors, fonts, panelStyle, spacing } from '../../../styles/theme';
import CardBack from '../CardBack';
import CardFace from '../CardFace';
import { cardKey, isRedSuit, suitSymbol } from '../utils/cardMapper';

const TEAM_A_COLOR = '#38bdf8';
const TEAM_B_COLOR = '#f472b6';

const SCORE_CARD_W  = Math.round(28 * 1.2); // 34
const SCORE_CARD_H  = Math.round(SCORE_CARD_W * cardTokens.ratio);
const STACK_OFFSET  = Math.round(SCORE_CARD_W * 0.2); // 20% peek
const BADGE_SIZE    = 25;
const SPREAD_GAP    = 6;
const EXPAND_ANIM_MS = 220;

// ── History table constants ────────────────────────────────────────────────
const HIST_CARD_W        = 18;
const HIST_CARD_H        = Math.round(HIST_CARD_W * cardTokens.ratio);
const HIST_BADGE         = 13;
const HIST_STACK_OFFSET  = Math.round(HIST_CARD_W * 0.22); // ~4px peek

const RESULT_DISPLAY = {
  'win-by-tricks':    { prefix: 'win by', main: 'Tricks' },
  'win-by-mendi':     { prefix: 'win by', main: 'Tens' },
  mendikot:           { prefix: null,     main: 'Mendikot!' },
  '52-card mendikot': { prefix: null,     main: '52 Patta!' },
};

// ── History scoreboard sub-components ─────────────────────────────────────

const HistoryTeamCell = memo(function HistoryTeamCell({ tricks, tensCards, color }) {
  const n = tensCards.length;
  const stackWidth = n > 0 ? HIST_CARD_W + (n - 1) * HIST_STACK_OFFSET : 0;

  return (
    <View style={histStyles.teamCell}>
      {/* Tens stack (left) — face up */}
      {n > 0 ? (
        <View style={[histStyles.tensStack, { width: stackWidth, height: HIST_CARD_H }]}>
          {tensCards.map((card, i) => (
            <View key={cardKey(card) + i} style={[histStyles.tensStackCard, { left: i * HIST_STACK_OFFSET, zIndex: i + 1 }]}>
              <CardFace card={card} width={HIST_CARD_W} square />
            </View>
          ))}
        </View>
      ) : (
        <View style={[histStyles.tensStack, { width: HIST_CARD_W, height: HIST_CARD_H, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={histStyles.noTens}>–</Text>
        </View>
      )}

      {/* Tricks (right) */}
      <View style={histStyles.miniTricksWrap}>
        <CardBack width={HIST_CARD_W} />
        <View style={[histStyles.miniBadge, { backgroundColor: color }]}>
          <Text style={histStyles.miniBadgeText}>{tricks}</Text>
        </View>
      </View>
    </View>
  );
});

const HistoryRow = memo(function HistoryRow({ round }) {
  const { roundNumber, winningTeam, type, tricks_by_team, tens_cards_by_team } = round;
  const rd = RESULT_DISPLAY[type] || { prefix: null, main: type };
  const winColor = winningTeam === 'A' ? TEAM_A_COLOR : TEAM_B_COLOR;
  const rowBg     = winningTeam === 'A' ? 'rgba(56,189,248,0.10)' : 'rgba(244,114,182,0.10)';
  const winCellBg = winningTeam === 'A' ? 'rgba(56,189,248,0.35)' : 'rgba(244,114,182,0.35)';
  const aCellBg   = winningTeam === 'A' ? winCellBg : 'rgba(56,189,248,0.10)';
  const bCellBg   = winningTeam === 'B' ? winCellBg : 'rgba(244,114,182,0.10)';

  return (
    <View style={[histStyles.row, { backgroundColor: rowBg }]}>
      <View style={histStyles.roundNumCell}>
        <Text style={histStyles.roundNum}>{roundNumber}</Text>
      </View>

      <View style={[histStyles.teamCellWrap, { backgroundColor: aCellBg }]}>
        <HistoryTeamCell
          tricks={tricks_by_team?.A ?? 0}
          tensCards={tens_cards_by_team?.A || []}
          color={TEAM_A_COLOR}
        />
      </View>

      <View style={[histStyles.teamCellWrap, { backgroundColor: bCellBg }]}>
        <HistoryTeamCell
          tricks={tricks_by_team?.B ?? 0}
          tensCards={tens_cards_by_team?.B || []}
          color={TEAM_B_COLOR}
        />
      </View>

      <View style={[histStyles.resultCellWrap, { backgroundColor: winCellBg }]}>
        {rd.prefix ? (
          <Text style={histStyles.resultPrefix}>{rd.prefix}</Text>
        ) : null}
        <Text style={[histStyles.resultMain, { color: winColor }]}>{rd.main}</Text>
      </View>
    </View>
  );
});

// ── Current round row (live, no result yet) ───────────────────────────────

const CurrentRoundRow = memo(function CurrentRoundRow({
  roundNumber, tricksByTeam, tensCardsByTeam,
}) {
  return (
    <View style={[histStyles.row, histStyles.currentRowHighlight]}>
      <View style={histStyles.roundNumCell}>
        <Text style={histStyles.roundNum}>{roundNumber}</Text>
      </View>

      <View style={histStyles.teamCellWrap}>
        <HistoryTeamCell
          tricks={tricksByTeam?.A ?? 0}
          tensCards={tensCardsByTeam?.A || []}
          color={TEAM_A_COLOR}
        />
      </View>

      <View style={histStyles.teamCellWrap}>
        <HistoryTeamCell
          tricks={tricksByTeam?.B ?? 0}
          tensCards={tensCardsByTeam?.B || []}
          color={TEAM_B_COLOR}
        />
      </View>

      <View style={histStyles.resultCellWrap}>
        <Text style={histStyles.nowLabel}>now</Text>
      </View>
    </View>
  );
});

// ── Mendikot menu overlay ──────────────────────────────────────────────────

const MendikotMenuModal = memo(function MendikotMenuModal({
  visible, onClose, isAdmin, onQuit,
  roundResults, currentRoundNumber, tricksByTeam, tensCardsByTeam,
}) {
  const showCurrentRow = !roundResults.some((r) => r.roundNumber === currentRoundNumber);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={menuStyles.backdrop} onPress={onClose}>
        {/* Inner Pressable absorbs touches so backdrop doesn't close */}
        <Pressable style={menuStyles.card} onPress={() => {}}>

          {/* ── Header ── */}
          <View style={menuStyles.header}>
            {isAdmin ? (
              <Pressable
                style={menuStyles.endBtn}
                onPress={() => { onClose(); onQuit(); }}
                hitSlop={6}
              >
                <Text style={menuStyles.endBtnText}>END</Text>
              </Pressable>
            ) : (
              <View style={menuStyles.headerSide} />
            )}

            <Text style={menuStyles.title}>HISTORY</Text>

            <View style={menuStyles.headerSide}>
              <Pressable style={menuStyles.closeBtn} onPress={onClose} hitSlop={10}>
                <Text style={menuStyles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>

          <View style={menuStyles.divider} />

          {/* ── Table ── */}
          <ScrollView
            style={menuStyles.scroll}
            contentContainerStyle={menuStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Table header */}
            <View style={menuStyles.tableHead}>
              <Text style={[menuStyles.th, menuStyles.thNum]}>#</Text>
              <Text style={[menuStyles.th, menuStyles.thTeam, { color: TEAM_A_COLOR }]}>Team A</Text>
              <Text style={[menuStyles.th, menuStyles.thTeam, { color: TEAM_B_COLOR }]}>Team B</Text>
              <Text style={[menuStyles.th, menuStyles.thResult]}>Result</Text>
            </View>

            {roundResults.length === 0 && !showCurrentRow ? (
              <Text style={menuStyles.emptyText}>No rounds completed yet</Text>
            ) : (
              roundResults.map((r) => (
                <HistoryRow key={r.roundNumber} round={r} />
              ))
            )}

            {showCurrentRow ? (
              <CurrentRoundRow
                roundNumber={currentRoundNumber}
                tricksByTeam={tricksByTeam}
                tensCardsByTeam={tensCardsByTeam}
              />
            ) : null}
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
});

// ── Main HUD components ────────────────────────────────────────────────────

const AnimatedTenCard = memo(function AnimatedTenCard({ card, index, progress }) {
  const cardAnimStyle = useAnimatedStyle(() => {
    const stackedLeft = index * STACK_OFFSET;
    const spreadLeft = index * (SCORE_CARD_W + SPREAD_GAP);

    return {
      left: stackedLeft + (spreadLeft - stackedLeft) * progress.value,
    };
  }, [index, progress]);

  return (
    <Animated.View style={[styles.tensStackCard, { zIndex: index + 1 }, cardAnimStyle]}>
      <CardFace card={card} width={SCORE_CARD_W} square />
    </Animated.View>
  );
});

const TeamScoreArea = memo(function TeamScoreArea({ tricks, tensCards, color, alignRight }) {
  const [spread, setSpread] = useState(false);
  const [isRaised, setIsRaised] = useState(false);
  const spreadTimerRef = useRef(null);
  const spreadProgress = useSharedValue(0);

  const n = tensCards.length;
  const stackWidth  = n > 0 ? SCORE_CARD_W + (n - 1) * STACK_OFFSET : 0;
  const spreadWidth = n > 0 ? n * SCORE_CARD_W + (n - 1) * SPREAD_GAP : 0;

  useEffect(() => {
    spreadProgress.value = withTiming(spread ? 1 : 0, {
      duration: EXPAND_ANIM_MS,
      easing: spread ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
    });
  }, [spread, spreadProgress]);

  useEffect(() => {
    if (spread && n > 0) {
      setIsRaised(true);
      return undefined;
    }

    if (isRaised) {
      const closeTimer = setTimeout(() => setIsRaised(false), EXPAND_ANIM_MS);
      return () => clearTimeout(closeTimer);
    }

    return undefined;
  }, [spread, n, isRaised]);

  useEffect(() => () => {
    if (spreadTimerRef.current) clearTimeout(spreadTimerRef.current);
  }, []);

  const tensStackAnimStyle = useAnimatedStyle(() => ({
    width: stackWidth + (spreadWidth - stackWidth) * spreadProgress.value,
  }), [stackWidth, spreadWidth, spreadProgress]);

  const tensSpreadBgAnimStyle = useAnimatedStyle(() => ({
    opacity: spreadProgress.value,
    transform: [{ scale: 0.96 + 0.04 * spreadProgress.value }],
  }), [spreadProgress]);

  const handleTensPress = () => {
    if (spreadTimerRef.current) {
      clearTimeout(spreadTimerRef.current);
      spreadTimerRef.current = null;
    }

    if (spread) {
      setSpread(false);
    } else {
      setSpread(true);
      spreadTimerRef.current = setTimeout(() => setSpread(false), 3000);
    }
  };

  const tricksNode = (
    <View style={styles.tricksWrap}>
      <CardBack width={SCORE_CARD_W} />
      <View style={[styles.tricksBadge, { backgroundColor: color }]}>
        <Text style={styles.tricksBadgeText}>{tricks}</Text>
      </View>
    </View>
  );

  const tensNode = n > 0 ? (
    <Pressable
      onPress={handleTensPress}
      hitSlop={6}
      style={[styles.tensPressable, isRaised && styles.tensPressableRaised]}
    >
      <Animated.View style={[styles.tensStack, { height: SCORE_CARD_H }, tensStackAnimStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tensSpreadBg,
            { width: spreadWidth + 10, height: SCORE_CARD_H + 10 },
            tensSpreadBgAnimStyle,
          ]}
        />
        {tensCards.map((card, i) => {
          return (
            <AnimatedTenCard
              key={cardKey(card) + i}
              card={card}
              index={i}
              progress={spreadProgress}
            />
          );
        })}
      </Animated.View>
    </Pressable>
  ) : null;

  return (
    <View
      style={[
        styles.teamScoreArea,
        alignRight && styles.teamScoreAreaRight,
        isRaised && styles.teamScoreAreaRaised,
      ]}
    >
      {alignRight ? (
        <>
          {tricksNode}
          {tensNode}
        </>
      ) : (
        <>
          {tensNode}
          {tricksNode}
        </>
      )}
    </View>
  );
});

/**
 * Compact in-game HUD for Mendikot.
 * Layout: [Team A score] [pill: trump + round + menu button] [Team B score]
 * Hamburger menu opens a modal overlay with round history scoreboard.
 */
const MendikotHUD = memo(({ phase, onShowSettings, isAdmin, onQuit }) => {
  const [showMenu, setShowMenu] = useState(false);

  const tricksByTeam    = useSelector((s) => s.game.tricks_by_team) || { A: 0, B: 0 };
  const tensCardsByTeam = useSelector((s) => s.game.tens_cards_by_team) || { A: [], B: [] };
  const trump_suit      = useSelector((s) => s.game.trump_suit);
  const trump_card      = useSelector((s) => s.game.closed_trump_card);
  const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
  const totalRounds     = useSelector((s) => s.game.totalRounds) || 1;
  const roundResults    = useSelector((s) => s.game.round_results) || [];
  const isPlaying       = phase === 'playing';

  return (
    <View style={styles.outerWrap}>
      {/* ── Main HUD row: Team A | pill | Team B ── */}
      <View style={styles.hudRow}>

        {/* Team A score (left) */}
        {isPlaying ? (
          <TeamScoreArea
            tricks={tricksByTeam.A}
            tensCards={tensCardsByTeam.A || []}
            color={TEAM_A_COLOR}
            alignRight={false}
          />
        ) : <View style={styles.teamScoreArea} />}

        {/* Centre pill */}
        <View style={styles.pill}>
          <Pressable style={styles.menuZone} onPress={() => setShowMenu(true)}>
            {isPlaying ? (
              <View style={styles.trumpChip}>
                {trump_suit ? (
                  <Text style={[styles.trumpSymbol, isRedSuit(trump_suit) && styles.trumpRed]}>
                    {suitSymbol(trump_suit)}{trump_card?.rank ?? ''}
                  </Text>
                ) : (
                  <Text style={styles.trumpUnknown}>?</Text>
                )}
              </View>
            ) : null}

            {isPlaying ? <View style={styles.divider} /> : null}

            <Text style={styles.roundText}>Rd {currentRoundNumber}/{totalRounds}</Text>
            <Text style={styles.iconText}>☰</Text>
          </Pressable>

          <Pressable style={styles.iconBtn} onPress={onShowSettings} hitSlop={8}>
            <Text style={styles.iconText}>⚙</Text>
          </Pressable>
        </View>

        {/* Team B score (right) */}
        {isPlaying ? (
          <TeamScoreArea
            tricks={tricksByTeam.B}
            tensCards={tensCardsByTeam.B || []}
            color={TEAM_B_COLOR}
            alignRight
          />
        ) : <View style={styles.teamScoreArea} />}

      </View>

      <MendikotMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        isAdmin={isAdmin}
        onQuit={onQuit}
        roundResults={roundResults}
        currentRoundNumber={currentRoundNumber}
        tricksByTeam={tricksByTeam}
        tensCardsByTeam={tensCardsByTeam}
      />
    </View>
  );
});

MendikotHUD.displayName = 'MendikotHUD';
export default MendikotHUD;

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerWrap: {
    gap: 4,
    overflow: 'visible',
  },

  // ── Main HUD row ─────────────────────────────────────────────────────────
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },

  // ── Team score areas ──────────────────────────────────────────────────────
  teamScoreArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    position: 'relative',
    overflow: 'visible',
  },
  teamScoreAreaRight: {
    justifyContent: 'flex-end',
  },
  teamScoreAreaRaised: {
    zIndex: 10,
    elevation: 10,
  },
  tensPressable: {
    position: 'relative',
    overflow: 'visible',
  },
  tensPressableRaised: {
    zIndex: 11,
    elevation: 11,
  },
  tricksWrap: {
    position: 'relative',
    width: SCORE_CARD_W,
    height: SCORE_CARD_H,
  },
  tricksBadge: {
    position: 'absolute',
    top: (SCORE_CARD_H - BADGE_SIZE) / 2,
    left: (SCORE_CARD_W - BADGE_SIZE) / 2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  tricksBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    fontWeight: '900',
    color: '#000',
    lineHeight: 14,
  },
  tensStack: {
    position: 'relative',
    overflow: 'visible',
  },
  tensSpreadBg: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 8,
  },
  tensStackCard: {
    position: 'absolute',
    top: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },

  // ── Control pill ──────────────────────────────────────────────────────────
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
    alignSelf: 'flex-start',
    position: 'relative',
    zIndex: 1,
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
  trumpUnknown: {
    fontSize: 13,
    color: colors.creamMuted,
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
});

// ── Menu modal styles ─────────────────────────────────────────────────────

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

  // ── Header ──────────────────────────────────────────────────────────────
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

  // ── Table ────────────────────────────────────────────────────────────────
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.18)',
  },
  th: {
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  thNum: {
    width: 24,
    textAlign: 'center',
  },
  thTeam: {
    flex: 1,
    textAlign: 'center',
  },
  thResult: {
    flex: 1,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});

// ── History row styles ────────────────────────────────────────────────────

const histStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  roundNumCell: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNum: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.creamMuted,
  },
  teamCellWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tensStack: {
    position: 'relative',
    overflow: 'visible',
  },
  tensStackCard: {
    position: 'absolute',
    top: 0,
  },
  noTens: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.creamMuted,
    fontStyle: 'italic',
  },
  miniTricksWrap: {
    position: 'relative',
    width: HIST_CARD_W,
    height: HIST_CARD_H,
  },
  miniBadge: {
    position: 'absolute',
    top: (HIST_CARD_H - HIST_BADGE) / 2,
    left: (HIST_CARD_W - HIST_BADGE) / 2,
    width: HIST_BADGE,
    height: HIST_BADGE,
    borderRadius: HIST_BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  miniBadgeText: {
    fontSize: 8,
    fontFamily: fonts.bodyBold,
    fontWeight: '900',
    color: '#000',
    lineHeight: 10,
  },
  currentRowHighlight: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopColor: 'rgba(201,162,39,0.20)',
  },
  nowLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.creamMuted,
    fontStyle: 'italic',
  },
  resultCellWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  resultPrefix: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: colors.creamMuted,
    lineHeight: 9,
  },
  resultMain: {
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
});
