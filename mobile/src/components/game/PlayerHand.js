import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { cardTokens } from '../../styles/theme';
import { hapticSelection } from '../../utils/haptics';
import CardBack from './CardBack';
import CardFace from './CardFace';
import { cardKey, isCardInList, sortCardsBySuit } from './utils/cardMapper';

const CARD_W = cardTokens.sizes.hand.width;   // 56
const CARD_H = cardTokens.sizes.hand.height;   // 78
const DEFAULT_OVERLAP = 18;                     // negative margin between cards
const MIN_STEP = 16;                            // minimum visible width per card
const PAD_H = 4;                                // horizontal padding each side
const RISE_PX = Math.round(CARD_H * 0.7);      // rise 70% of card height
const SPRING_CFG = { damping: 20, stiffness: 300, mass: 0.5 };

/**
 * PlayerHand — gesture-enabled card fan.
 *
 * Touch & drag over the hand to preview cards (nearest card rises).
 * Tap a card to select it as the "intended card" (communicated via onSelectCard).
 * No card is played directly from this component.
 */
export default function PlayerHand({
  cards = [],
  validPlays = [],
  isMyTurn = false,
  onSelectCard,
  intendedCard = null,
}) {
  const { width: screenW } = useWindowDimensions();
  const handSorted = useSelector((state) => state.game.handSorted);
  // Don't sort face-down hands (band-hukum-pick) — position is meaningful
  const hasFaceDown = cards.some((c) => c?.faceDown);
  const displayCards = useMemo(
    () => (handSorted && !hasFaceDown ? sortCardsBySuit(cards) : cards),
    [cards, handSorted, hasFaceDown],
  );

  // Compute card step dynamically so all cards fit on screen
  const count = displayCards.length;
  const cardStep = useMemo(() => {
    if (count <= 1) return CARD_W;
    const availableW = screenW - PAD_H * 2;
    // Total width: CARD_W + (count-1) * step
    const maxStep = CARD_W - DEFAULT_OVERLAP; // default step = 38
    const fittingStep = Math.floor((availableW - CARD_W) / (count - 1));
    return Math.max(MIN_STEP, Math.min(maxStep, fittingStep));
  }, [count, screenW]);
  const overlap = CARD_W - cardStep;

  const cardsRef = useRef(displayCards);
  cardsRef.current = displayCards;
  const cardStepRef = useRef(cardStep);
  cardStepRef.current = cardStep;

  const onSelectCardRef = useRef(onSelectCard);
  onSelectCardRef.current = onSelectCard;

  // Shared value: index of the card currently being hovered (-1 = none)
  const hoveredIndex = useSharedValue(-1);

  // JS-thread: handle card selection — passes (card, originalIndex) to support
  // face-down pick-by-position (band-hukum-pick phase needs the original index).
  const selectCardAtIndex = useCallback((idx) => {
    const cards = cardsRef.current;
    if (idx >= 0 && idx < cards.length) {
      hapticSelection();
      onSelectCardRef.current?.(cards[idx], idx);
    }
  }, []);

  // JS-thread: compute index and update hover shared value
  const prevHoverRef = useRef(-1);
  const updateHoverFromX = useCallback((absX) => {
    const x = absX - PAD_H;
    const count = cardsRef.current?.length || 0;
    if (count === 0) return;
    const step = cardStepRef.current;
    const idx = Math.max(0, Math.min(Math.floor(x / step), count - 1));
    if (idx !== prevHoverRef.current) {
      prevHoverRef.current = idx;
      hapticSelection();
    }
    hoveredIndex.value = idx;
  }, [hoveredIndex]);

  const selectHoveredAndReset = useCallback(() => {
    const idx = hoveredIndex.value;
    hoveredIndex.value = -1;
    selectCardAtIndex(idx);
  }, [hoveredIndex, selectCardAtIndex]);

  const resetHover = useCallback(() => {
    hoveredIndex.value = -1;
    prevHoverRef.current = -1;
  }, [hoveredIndex]);

  const selectFromTapX = useCallback((absX) => {
    const x = absX - PAD_H;
    const count = cardsRef.current?.length || 0;
    if (count === 0) return;
    const step = cardStepRef.current;
    const idx = Math.max(0, Math.min(Math.floor(x / step), count - 1));
    selectCardAtIndex(idx);
  }, [selectCardAtIndex]);

  // ── Gesture: long press + pan to preview cards ──────────────────────────
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart((e) => {
      runOnJS(updateHoverFromX)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(updateHoverFromX)(e.x);
    })
    .onEnd(() => {
      runOnJS(selectHoveredAndReset)();
    })
    .onFinalize(() => {
      runOnJS(resetHover)();
    });

  // ── Gesture: tap to select a card ───────────────────────────────────────
  const tap = Gesture.Tap()
    .onEnd((e) => {
      runOnJS(selectFromTapX)(e.x);
    });

  const composed = Gesture.Race(pan, tap);

  if (!displayCards.length) return null;

  const intendedKey = intendedCard ? cardKey(intendedCard) : null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View>
        <View style={[styles.listContent, { paddingLeft: PAD_H, paddingRight: PAD_H + overlap }]}>
          {displayCards.map((card, i) => {
            const key = card?.faceDown ? `facedown_${i}` : cardKey(card);
            const playable = !isMyTurn || card?.faceDown || isCardInList(card, validPlays);
            const isIntended = key === intendedKey;

            return (
              <AnimatedCard
                key={key}
                index={i}
                card={card}
                playable={playable}
                isMyTurn={isMyTurn}
                isIntended={isIntended}
                hoveredIndex={hoveredIndex}
                overlap={overlap}
              />
            );
          })}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * AnimatedCard — individual card in the fan that rises when hovered.
 */
function AnimatedCard({ index, card, playable, isMyTurn, isIntended, hoveredIndex, overlap }) {
  const animStyle = useAnimatedStyle(() => {
    const isHovered = hoveredIndex.value === index;
    return {
      transform: [
        { translateY: withSpring(isHovered ? -RISE_PX : 0, SPRING_CFG) },
      ],
      zIndex: isHovered ? 10 : 0,
    };
  });

  return (
    <Animated.View style={[{ marginRight: -overlap }, isIntended && styles.cardWrapIntended, animStyle]}>
      {card?.faceDown ? (
        <CardBack width={CARD_W} />
      ) : (
        <CardFace
          card={card}
          width={CARD_W}
          disabled={!playable}
          selected={isIntended}
          playable={playable && isMyTurn}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingTop: RISE_PX + 6,  // room for cards to rise without clipping
  },
  cardWrapIntended: {
    transform: [{ translateY: -10 }],
    zIndex: 2,
    marginRight: -4,
  },
});
