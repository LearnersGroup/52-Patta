import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, shadows, spacing, typography } from '../../../styles/theme';

export default function PlayerSeat({
  name,
  avatar,
  avatarInitial,
  cardCount = 0,
  isTurn = false,
  isDealer = false,
  team = null,
  tricksWon = null,
}) {
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isTurn) {
      glowOpacity.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isTurn, glowOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    shadowColor: 'rgba(201, 162, 39, 0.6)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowOpacity.value * 0.7,
    shadowRadius: 10 + glowOpacity.value * 4,
    elevation: glowOpacity.value > 0.1 ? 6 : 0,
  }));

  return (
    <Animated.View
      style={[
        styles.wrap,
        team === 'bid' && styles.bidTeam,
        team === 'oppose' && styles.opposeTeam,
        isTurn && styles.turn,
        isTurn && pulseStyle,
      ]}
    >
      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{avatarInitial || '?'}</Text>
          </View>
        )}
        {isDealer ? (
          <View style={styles.dealerBadge}>
            <Text style={styles.badgeText}>D</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} style={styles.name}>
        {name || 'Player'}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{cardCount} cards</Text>
        {typeof tricksWon === 'number' ? <Text style={styles.metaText}>{'\u2022'} {tricksWon} won</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 12,
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
    ...shadows.shallow,
  },
  turn: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  bidTeam: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    backgroundColor: 'rgba(201, 162, 39, 0.08)',
  },
  opposeTeam: {
    borderLeftWidth: 3,
    borderLeftColor: colors.redSuit,
    backgroundColor: 'rgba(204, 41, 54, 0.08)',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgPanelLight,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.cream,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 16,
  },
  dealerBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    ...shadows.shallow,
  },
  badgeText: {
    color: colors.bgDeep,
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '800',
  },
  name: {
    color: colors.creamMuted,
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 82,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
});
