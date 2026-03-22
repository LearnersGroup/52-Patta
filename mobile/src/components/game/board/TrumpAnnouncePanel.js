import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { WsProceedToShuffle } from '../../../api/wsEmitters';
import { colors, fonts, pillStyle, typography } from '../../../styles/theme';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

export default function TrumpAnnouncePanel({ trumpSuit, trumpMode = 'random', isDealer = false }) {
  const [countdown, setCountdown] = useState(3);
  const pulse = useSharedValue(1);

  useEffect(() => {
    setCountdown(3);
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

  // Auto-proceed to shuffle when countdown finishes (dealer only)
  useEffect(() => {
    if (countdown === 0 && isDealer) {
      WsProceedToShuffle();
    }
  }, [countdown, isDealer]);

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '80%',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  suit: {
    fontSize: 54,
    fontWeight: '700',
    lineHeight: 60,
    textShadowColor: 'rgba(0,0,0,0.6)',
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
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countdownPill: {
    ...pillStyle,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  countdownText: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
});
