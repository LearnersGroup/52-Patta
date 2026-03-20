import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, panelStyle, spacing, typography } from '../../../styles/theme';
import CardBack from '../CardBack';

function DealingCard({ delay = 0, driftX = 0, driftY = 0, width = 44 }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(0, { duration: 1 });
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      false
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => {
    const p = (progress.value + delay) % 1;
    return {
      transform: [
        { translateX: p * driftX },
        { translateY: p * driftY },
        { rotateZ: `${(-6 + (p * 12))}deg` },
        { scale: 0.92 + (0.1 * Math.sin(p * Math.PI)) },
      ],
      opacity: 0.35 + (0.65 * Math.sin(p * Math.PI)),
    };
  });

  return (
    <Animated.View style={[styles.flyCard, animStyle]}>
      <CardBack width={width} />
    </Animated.View>
  );
}

export default function DealingOverlay({ myHand = [], dealingConfig }) {
  const durationMs = dealingConfig?.animationDurationMs || 5000;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(durationMs, Date.now() - started);
      setElapsed(next);
      if (next >= durationMs) clearInterval(timer);
    }, 100);

    return () => clearInterval(timer);
  }, [durationMs, myHand.length]);

  const progress = useMemo(() => {
    if (!durationMs) return 0;
    return Math.max(0, Math.min(1, elapsed / durationMs));
  }, [elapsed, durationMs]);

  return (
    <View style={styles.wrap}>
      <View style={styles.deckRow}>
        <View style={[styles.stack, { transform: [{ translateX: -6 }, { translateY: -4 }] }]}>
          <CardBack width={44} />
        </View>
        <View style={[styles.stack, { transform: [{ translateX: -3 }, { translateY: -2 }] }]}>
          <CardBack width={44} />
        </View>
        <View style={styles.stackTop}>
          <CardBack width={44} />
        </View>

        <DealingCard delay={0.05} driftX={-62} driftY={-32} />
        <DealingCard delay={0.28} driftX={64} driftY={-28} />
        <DealingCard delay={0.46} driftX={58} driftY={40} />
        <DealingCard delay={0.64} driftX={-54} driftY={44} />
      </View>

      <Text style={styles.title}>Dealing cards...</Text>
      <Text style={styles.subtitle}>{myHand.length ? `${myHand.length} cards incoming` : 'Preparing your hand'}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    width: '100%',
    maxWidth: 270,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  deckRow: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    position: 'absolute',
    opacity: 0.9,
  },
  stackTop: {
    position: 'absolute',
  },
  flyCard: {
    position: 'absolute',
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
    fontSize: 14,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderGold,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 999,
  },
});
