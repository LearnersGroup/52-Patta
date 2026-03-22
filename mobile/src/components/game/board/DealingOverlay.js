import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, spacing, typography } from '../../../styles/theme';
import CardBack from '../CardBack';

/**
 * A single flying card that animates from the center toward a player's seat.
 */
function FlyingCard({ angle, distance, durationMs }) {
  const progress = useSharedValue(0);
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, durationMs]);

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: p * dx },
        { translateY: p * dy },
        { scale: 1 - p * 0.4 },
      ],
      opacity: 1 - p * 0.8,
    };
  });

  return (
    <Animated.View style={[styles.flyCard, animStyle]}>
      <CardBack width={34} />
    </Animated.View>
  );
}

/**
 * DealingOverlay — shown during the "dealing" phase.
 *
 * Mimics the web app: spawns flying card-backs from a central deck toward
 * each player's seat position in round-robin order from dealer's left.
 */
export default function DealingOverlay({
  myHand = [],
  dealingConfig,
  seatOrder = [],
  dealerIndex = 0,
  userId = '',
  seatPositionMap = {},
  tableSize = 300,
}) {
  const durationMs = dealingConfig?.animationDurationMs || 5000;
  const [elapsed, setElapsed] = useState(0);
  const [flyingCards, setFlyingCards] = useState([]);

  // Deal order: round-robin from dealer's left
  const dealOrder = useMemo(() => {
    const N = seatOrder.length;
    if (N === 0) return [];
    return Array.from({ length: N }, (_, i) =>
      seatOrder[(dealerIndex + 1 + i) % N]
    );
  }, [seatOrder, dealerIndex]);

  const dealOrderRef = useRef(dealOrder);
  dealOrderRef.current = dealOrder;
  const seatPosRef = useRef(seatPositionMap);
  seatPosRef.current = seatPositionMap;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Distance cards travel toward seats
  const travelDist = tableSize * 0.64;

  // Spawn flying cards
  useEffect(() => {
    const N = seatOrder.length;
    const C = myHand.length; // cards per player
    if (N === 0 || C === 0) return;

    const totalCards = N * C;
    const intervalMs = Math.max(40, (durationMs * 0.85) / totalCards);
    const flyMs = Math.min(420, intervalMs * 3.5);

    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= totalCards) { clearInterval(timer); return; }

      const playerIdx = idx % N;
      const targetId = dealOrderRef.current[playerIdx];
      const isMe = targetId === userIdRef.current;
      const angle = isMe
        ? Math.PI / 2
        : (seatPosRef.current[targetId]?.angle ?? 0);

      const id = Date.now() + Math.random();
      setFlyingCards((prev) => [...prev, { id, angle, flyMs }]);
      setTimeout(() => {
        setFlyingCards((prev) => prev.filter((c) => c.id !== id));
      }, flyMs + 50);

      idx++;
    }, intervalMs);

    return () => clearInterval(timer);
  }, [myHand.length, seatOrder.length, durationMs]);

  // Progress bar
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
      {/* Deck + flying cards */}
      <View style={styles.deckArea}>
        {/* Stacked deck */}
        <View style={[styles.stack, { transform: [{ translateX: -4 }, { translateY: -3 }] }]}>
          <CardBack width={34} />
        </View>
        <View style={[styles.stack, { transform: [{ translateX: -2 }, { translateY: -1.5 }] }]}>
          <CardBack width={34} />
        </View>
        <View style={styles.stackTop}>
          <CardBack width={34} />
        </View>

        {/* Flying cards */}
        {flyingCards.map((card) => (
          <FlyingCard
            key={card.id}
            angle={card.angle}
            distance={travelDist}
            durationMs={card.flyMs}
          />
        ))}
      </View>

      <Text style={styles.title}>Dealing...</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '80%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deckArea: {
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    position: 'absolute',
    opacity: 0.85,
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
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressTrack: {
    width: '60%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 999,
  },
});
