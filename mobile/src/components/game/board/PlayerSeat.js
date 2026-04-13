import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, shadows } from '../../../styles/theme';
import AvatarImage from '../../shared/AvatarImage';

/**
 * jdgStatus shape (Judgement only, null otherwise):
 *   { label: string, type: 'waiting' | 'placed' | 'on-target' | 'over' | 'under' }
 *
 * relation: null | 'partner' | 'teammate' | 'opponent'
 */
const MENDIKOT_TEAM_A_COLOR = '#38bdf8';
const MENDIKOT_TEAM_B_COLOR = '#f472b6';

const PlayerSeat = memo(function PlayerSeat({
  name,
  avatar,
  avatarInitial,
  isTurn = false,
  isDealer = false,
  isBidder = false,
  team = null,
  jdgStatus = null,
  relation = null,
  mendikotTeam = null, // 'team-a' | 'team-b' | null
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

  // Ring color based on team (or mendikot team override)
  const baseColor =
    mendikotTeam === 'team-a' ? MENDIKOT_TEAM_A_COLOR :
    mendikotTeam === 'team-b' ? MENDIKOT_TEAM_B_COLOR :
    team === 'bid'    ? colors.gold :
    team === 'oppose' ? colors.redSuit :
    colors.borderGold;

  // Active turn: full-width ring + pulsing glow in ring color
  // Inactive: half-width ring, no glow
  const ringStyle = useAnimatedStyle(() => ({
    borderWidth: isTurn ? 3 : 1.5,
    shadowColor: isTurn ? baseColor : 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowOpacity.value * 0.8,
    shadowRadius: 8 + glowOpacity.value * 4,
    elevation: glowOpacity.value > 0.1 ? 5 : 0,
    borderColor: isTurn
      ? baseColor
      : baseColor,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.avatarRing, ringStyle]}>
        <View style={styles.avatarInner}>
          {avatar ? (
            <AvatarImage uri={avatar} width="100%" height="100%" />
          ) : (
            <Text style={styles.avatarInitial}>{avatarInitial || '?'}</Text>
          )}
        </View>

        {/* Dealer badge — top-right corner of the ring */}
        {isDealer ? (
          <View style={styles.dealerBadge}>
            <Text style={styles.dealerBadgeText}>D</Text>
          </View>
        ) : null}

        {/* Bidder badge — top-left corner of the ring */}
        {isBidder ? (
          <View style={styles.bidderBadge}>
            <Text style={styles.bidderBadgeText}>B</Text>
          </View>
        ) : null}
      </Animated.View>

      <Text numberOfLines={1} style={styles.name}>{name || 'Player'}</Text>

      {/* ── Relation badge ── */}
      {relation === 'partner' ? (
        <View style={styles.partnerBadge}>
          <Text style={styles.partnerBadgeText}>Partner</Text>
        </View>
      ) : relation === 'teammate' ? (
        <View style={styles.teammateBadge}>
          <Text style={styles.teammateBadgeText}>Teammate</Text>
        </View>
      ) : relation === 'opponent' ? (
        <View style={styles.opponentBadge}>
          <Text style={styles.opponentBadgeText}>Opponent</Text>
        </View>
      ) : relation === 'potential-teammate' ? (
        <View style={styles.potentialBadge}>
          <Text style={styles.potentialBadgeText}>Teammate?</Text>
        </View>
      ) : null}

      {jdgStatus ? (
        <View style={[styles.jdgChip, styles[`jdgChip_${jdgStatus.type}`]]}>
          <Text style={[styles.jdgChipText, styles[`jdgChipText_${jdgStatus.type}`]]}>
            {jdgStatus.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export default PlayerSeat;

const AVATAR = 58;          // larger avatar for visibility
const RING   = AVATAR + 10; // room for thicker border  (= 68)

const badgeBase = {
  borderRadius: 8,
  paddingHorizontal: 5,
  paddingVertical: 1,
  borderWidth: 1,
};

const badgeTextBase = {
  fontFamily: fonts.heading,
  fontSize: 7,
  fontWeight: '700',
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  textAlign: 'center',
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 3,
    width: 76,
  },

  avatarRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.bgPanelLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.cream,
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 17,
  },

  dealerBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shallow,
  },
  dealerBadgeText: {
    color: colors.bgDeep,
    fontFamily: fonts.heading,
    fontSize: 9,
    fontWeight: '800',
  },

  bidderBadge: {
    position: 'absolute',
    left: -2,
    top: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shallow,
  },
  bidderBadgeText: {
    color: '#fff',
    fontFamily: fonts.heading,
    fontSize: 9,
    fontWeight: '800',
  },

  name: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 74,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Relation badges ─────────────────────────────────────────────────────
  partnerBadge: {
    ...badgeBase,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: 'rgba(46, 204, 113, 0.35)',
  },
  partnerBadgeText: {
    ...badgeTextBase,
    color: '#2ecc71',
  },
  teammateBadge: {
    ...badgeBase,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  teammateBadgeText: {
    ...badgeTextBase,
    color: '#93c5fd',
  },
  opponentBadge: {
    ...badgeBase,
    backgroundColor: 'rgba(204, 41, 54, 0.18)',
    borderColor: 'rgba(204, 41, 54, 0.4)',
  },
  opponentBadgeText: {
    ...badgeTextBase,
    color: '#fca5a5',
  },
  potentialBadge: {
    ...badgeBase,
    backgroundColor: 'rgba(201, 162, 39, 0.15)',
    borderColor: 'rgba(201, 162, 39, 0.4)',
  },
  potentialBadgeText: {
    ...badgeTextBase,
    color: colors.goldLight,
  },

  // ── Judgement bid/tricks status chip ──────────────────────────────────────
  jdgChip: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  jdgChipText: {
    fontFamily: fonts.heading,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  // type variants
  jdgChip_waiting:    { borderColor: 'rgba(168,159,142,0.35)' },
  jdgChip_placed:     { borderColor: colors.borderGold },
  jdgChip_on_target:  { borderColor: 'rgba(46,204,113,0.5)', backgroundColor: 'rgba(46,204,113,0.1)' },
  jdgChip_over:       { borderColor: 'rgba(204,41,54,0.5)',  backgroundColor: 'rgba(204,41,54,0.1)' },
  jdgChip_under:      { borderColor: 'rgba(168,159,142,0.35)' },

  jdgChipText_waiting:   { color: colors.creamMuted },
  jdgChipText_placed:    { color: colors.goldLight },
  jdgChipText_on_target: { color: colors.readyLight },
  jdgChipText_over:      { color: colors.redSuit },
  jdgChipText_under:     { color: colors.creamMuted },
});
