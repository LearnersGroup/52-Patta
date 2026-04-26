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
 * A single flying card that animates from the deck toward a player's seat.
 * dx/dy are the exact pixel displacement to the target seat in deckArea space.
 */
function FlyingCard({ dx, dy, durationMs }) {
  const progress = useSharedValue(0);

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
  tableHeight = 500,
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

  // Shift deck origin toward dealer's seat
  const dealerId = seatOrder[dealerIndex] ?? seatOrder[0];
  const dealerAngle = seatPositionMap[dealerId]?.angle;
  const deckOffsetX = dealerAngle != null ? Math.cos(dealerAngle) * tableSize / 2 * 0.72 : 0;
  const deckOffsetY = dealerAngle != null ? Math.sin(dealerAngle) * tableHeight / 2 * 0.72 : 0;

  // Refs so the interval closure always reads the latest values
  const tableSizeRef = useRef(tableSize);
  tableSizeRef.current = tableSize;
  const tableHeightRef = useRef(tableHeight);
  tableHeightRef.current = tableHeight;
  const deckOffsetRef = useRef({ x: deckOffsetX, y: deckOffsetY });
  deckOffsetRef.current = { x: deckOffsetX, y: deckOffsetY };

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
      // Parametric angle on the ellipse — me is always at π/2 (bottom)
      const playerAngle = isMe
        ? Math.PI / 2
        : (seatPosRef.current[targetId]?.angle ?? 0);

      // Exact seat position relative to table centre (elliptical orbit)
      const ts = tableSizeRef.current;
      const th = tableHeightRef.current;
      const { x: ox, y: oy } = deckOffsetRef.current;
      // Travel from deck origin (0,0 of deckArea ≈ table centre + deckOffset) to seat
      const dx = Math.cos(playerAngle) * ts / 2 - ox;
      const dy = Math.sin(playerAngle) * th / 2 - oy;

      const id = Date.now() + Math.random();
      setFlyingCards((prev) => [...prev, { id, dx, dy, flyMs }]);
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
      {/* Deck + flying cards — centred in flex area, shifted toward dealer */}
      <View style={styles.deckWrapper}>
        <View style={[styles.deckArea, { transform: [{ translateX: deckOffsetX }, { translateY: deckOffsetY }] }]}>
          <View style={[styles.stack, { transform: [{ translateX: -4 }, { translateY: -3 }] }]}>
            <CardBack width={34} />
          </View>
          <View style={[styles.stack, { transform: [{ translateX: -2 }, { translateY: -1.5 }] }]}>
            <CardBack width={34} />
          </View>
          <View style={styles.stackTop}>
            <CardBack width={34} />
          </View>
          {flyingCards.map((card) => (
            <FlyingCard
              key={card.id}
              dx={card.dx}
              dy={card.dy}
              durationMs={card.flyMs}
            />
          ))}
        </View>
      </View>

      {/* Progress bar pinned to lower half of the table */}
      <View style={styles.progressSection}>
        <Text style={styles.title}>Dealing...</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
  },
  deckWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckArea: {
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    alignItems: 'center',
    paddingBottom: 12,
    gap: spacing.xs,
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
