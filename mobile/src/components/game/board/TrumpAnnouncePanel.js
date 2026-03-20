import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { WsProceedToShuffle } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, pillStyle, spacing, typography } from '../../../styles/theme';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

export default function TrumpAnnouncePanel({ trumpSuit, trumpMode = 'random', isDealer = false }) {
  const [countdown, setCountdown] = useState(5);
  const pulse = useSharedValue(1);

  useEffect(() => {
    setCountdown(5);
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
  }, [trumpSuit]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Trump Suit Is...</Text>
      <Animated.View style={pulseStyle}>
        <Text style={[styles.suit, isRedSuit(trumpSuit) ? styles.red : styles.black]}>
          {suitSymbol(trumpSuit || 'S')}
        </Text>
      </Animated.View>
      <Text style={styles.sub}>{trumpMode === 'fixed' ? 'Fixed rotation' : 'Random draw'}</Text>
      <View style={styles.countdownPill}>
        <Text style={styles.countdownText}>Proceeding to shuffle in {countdown}s</Text>
      </View>

      {isDealer ? (
        <Pressable style={styles.btn} onPress={WsProceedToShuffle}>
          <Text style={styles.btnText}>Proceed to Shuffle</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    width: '100%',
    maxWidth: 280,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
  },
  suit: {
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  red: {
    color: colors.redSuit,
  },
  black: {
    color: colors.cream,
  },
  sub: {
    ...typography.label,
    color: colors.creamMuted,
    fontSize: 11,
  },
  countdownPill: {
    ...pillStyle,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  countdownText: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
  btn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    marginTop: spacing.xs,
  },
  btnText: {
    ...buttonStyles.primaryText,
  },
});
