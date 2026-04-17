import { memo, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { cardTokens } from '../../styles/theme';
import CardBack from './CardBack';
import CardFace from './CardFace';

const CARD_W = cardTokens.sizes.hand.width * 0.65; // ~36 px
const CARD_H = CARD_W * cardTokens.ratio;           // ~51 px
const RING_HALF = 34; // half of the 68 px avatar ring

/**
 * Hidden trump card anchored to the trump holder's seat on the circular table.
 *
 * - Rotated so the card head faces the table centre.
 * - Positioned so it straddles the seat edge 50 % inside / 50 % outside the
 *   avatar ring.
 * - Bounces gently toward the table centre when the local player is eligible
 *   to reveal (pendingReveal).  Tap to reveal.
 */
const ClosedTrumpDisplay = memo(({
  revealed = false,
  card = null,
  seatPos = null,        // { x, y, angle } — CircularTable wrapper coords
  pendingReveal = false,
  onPress = null,
}) => {
  const jumpAmount = useSharedValue(0);

  // All hooks must be called unconditionally
  const angle = seatPos?.angle ?? 0;
  const rotationDeg = (angle * 180 / Math.PI) - 90;

  useEffect(() => {
    if (pendingReveal && seatPos) {
      jumpAmount.value = withRepeat(
        withSequence(
          withTiming(9, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 320 }), // brief pause before next jump
        ),
        -1,
        false,
      );
    } else {
      jumpAmount.value = withTiming(0, { duration: 200 });
    }
  }, [pendingReveal, seatPos, jumpAmount]);

  // After rotation, the card's local -Y axis points toward the table centre
  // for every seat position.  Animating translateY upward (negative) bounces
  // the card toward the centre — no need for trigonometry in the worklet.
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -jumpAmount.value }],
  }));

  if (!seatPos) return null;

  const { x, y } = seatPos;

  // Card centre sits at RING_HALF px from the seat centre in the inward
  // direction (toward table centre) → 50 % of card height overlaps the
  // avatar, 50 % pokes into the table area.
  const centerX = x - Math.cos(angle) * RING_HALF;
  const centerY = y - Math.sin(angle) * RING_HALF;

  return (
    <Pressable
      onPress={pendingReveal ? onPress : null}
      style={[
        styles.positioner,
        {
          left: centerX - CARD_W / 2,
          top: centerY - CARD_H / 2,
          width: CARD_W,
          height: CARD_H,
          transform: [{ rotate: `${rotationDeg}deg` }],
        },
      ]}
    >
      <Animated.View style={[{ width: CARD_W, height: CARD_H }, animStyle]}>
        {revealed && card ? (
          <CardFace card={card} width={CARD_W} />
        ) : (
          <CardBack width={CARD_W} />
        )}
      </Animated.View>
    </Pressable>
  );
});

ClosedTrumpDisplay.displayName = 'ClosedTrumpDisplay';
export default ClosedTrumpDisplay;

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
  },
});
