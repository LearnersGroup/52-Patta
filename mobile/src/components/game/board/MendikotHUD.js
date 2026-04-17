import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
      <CardFace card={card} width={SCORE_CARD_W} />
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
 * Layout: [Team A score] [pill: trump + round + controls] [Team B score]
 * Inline panel: per-team tricks + collected tens with CardFace mini icons.
 */
const MendikotHUD = memo(({ phase, onShowSettings, isAdmin, onQuit }) => {
  const [showScoreboard, setShowScoreboard] = useState(false);

  const tricksByTeam    = useSelector((s) => s.game.tricks_by_team) || { A: 0, B: 0 };
  const tensByTeam      = useSelector((s) => s.game.tens_by_team) || { A: 0, B: 0 };
  const tensCardsByTeam = useSelector((s) => s.game.tens_cards_by_team) || { A: [], B: [] };
  const trump_suit      = useSelector((s) => s.game.trump_suit);
  const trump_card      = useSelector((s) => s.game.closed_trump_card);
  const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
  const totalRounds     = useSelector((s) => s.game.totalRounds) || 1;
  const isPlaying       = phase === 'playing';

  const TEN_W = Math.round(cardTokens.sizes.hand.width * 0.5); // ~28 px for scoreboard panel

  const renderTens = (team) => {
    const cards = tensCardsByTeam[team] || [];
    if (cards.length === 0) {
      return <Text style={styles.noTens}>–</Text>;
    }
    return (
      <View style={styles.tensRow}>
        {cards.map((card, i) => (
          <View key={cardKey(card) + i} style={[styles.tenIcon, { width: TEN_W, height: Math.round(TEN_W * cardTokens.ratio) }]}>
            <CardFace card={card} width={TEN_W} />
          </View>
        ))}
      </View>
    );
  };

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
          {isPlaying && trump_suit ? (
            <Text style={[styles.trumpSymbol, isRedSuit(trump_suit) && styles.trumpRed]}>
              {suitSymbol(trump_suit)}{trump_card?.rank ?? ''}
            </Text>
          ) : isPlaying ? (
            <Text style={styles.trumpUnknown}>?</Text>
          ) : null}

          {isPlaying ? <View style={styles.divider} /> : null}

          <Text style={styles.roundText}>Rd {currentRoundNumber}/{totalRounds}</Text>

          <Pressable
            style={styles.iconBtn}
            onPress={() => setShowScoreboard((v) => !v)}
            hitSlop={8}
          >
            <Text style={styles.iconText}>{showScoreboard ? '▲' : '⊞'}</Text>
          </Pressable>

          {isAdmin ? (
            <Pressable style={styles.iconBtn} onPress={onQuit} hitSlop={8}>
              <Text style={styles.iconText}>✕</Text>
            </Pressable>
          ) : null}

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

      {/* ── Inline scoreboard panel ── */}
      {showScoreboard ? (
        <View style={styles.scorePanel}>
          {/* Team A */}
          <View style={styles.teamRow}>
            <Text style={[styles.teamRowName, { color: TEAM_A_COLOR }]}>Team A</Text>
            <Text style={styles.tricksText}>{tricksByTeam.A} trick{tricksByTeam.A !== 1 ? 's' : ''}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tensScroll}>
            {renderTens('A')}
          </ScrollView>

          <View style={styles.scoreDivider} />

          {/* Team B */}
          <View style={styles.teamRow}>
            <Text style={[styles.teamRowName, { color: TEAM_B_COLOR }]}>Team B</Text>
            <Text style={styles.tricksText}>{tricksByTeam.B} trick{tricksByTeam.B !== 1 ? 's' : ''}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tensScroll}>
            {renderTens('B')}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
});

MendikotHUD.displayName = 'MendikotHUD';
export default MendikotHUD;

const styles = StyleSheet.create({
  outerWrap: {
    gap: 4,
    overflow: 'visible',
  },

  // ── Main HUD row ───────────────────────────────────────────────────────────
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },

  // ── Team score areas ───────────────────────────────────────────────────────
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

  // ── Control pill ───────────────────────────────────────────────────────────
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
    position: 'relative',
    zIndex: 1,
  },
  trumpSymbol: {
    fontSize: 15,
    color: colors.cream,
    lineHeight: 17,
    fontFamily: fonts.body,
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
  iconBtn: {
    paddingHorizontal: 3,
  },
  iconText: {
    fontSize: 14,
    color: colors.gold,
    lineHeight: 16,
  },

  // ── Inline scoreboard panel ────────────────────────────────────────────────
  scorePanel: {
    ...panelStyle,
    padding: spacing.sm,
    gap: 4,
    minWidth: 180,
    maxWidth: 220,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  teamRowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
  },
  tricksText: {
    fontSize: 11,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  tensScroll: {
    marginBottom: 2,
  },
  tensRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  tenIcon: {
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  noTens: {
    fontSize: 11,
    color: colors.creamMuted,
    fontStyle: 'italic',
    fontFamily: fonts.body,
    paddingVertical: 2,
  },
  scoreDivider: {
    height: 1,
    backgroundColor: 'rgba(201,162,39,0.18)',
    marginVertical: 2,
  },
});
