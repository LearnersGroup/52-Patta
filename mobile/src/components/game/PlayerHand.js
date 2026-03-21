import { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
import CardFace from './CardFace';
import { cardKey, isCardInList, sortCardsBySuit } from './utils/cardMapper';

const CARD_W = cardTokens.sizes.hand.width;   // 56
const CARD_H = cardTokens.sizes.hand.height;   // 78
const OVERLAP = 18;                             // negative margin between cards
const CARD_STEP = CARD_W - OVERLAP;             // 38 — visible width per card
const PAD_LEFT = 4;
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
  const handSorted = useSelector((state) => state.game.handSorted);
  const displayCards = useMemo(
    () => (handSorted ? sortCardsBySuit(cards) : cards),
    [cards, handSorted],
  );

  const cardsRef = useRef(displayCards);
  cardsRef.current = displayCards;

  const onSelectCardRef = useRef(onSelectCard);
  onSelectCardRef.current = onSelectCard;

  // Shared value: index of the card currently being hovered (-1 = none)
  const hoveredIndex = useSharedValue(-1);
  const scrollOffsetRef = useRef(0);
  const scrollRef = useRef(null);

  // JS-thread helper: compute card index from touch x
  const getCardIndexFromX = useCallback((absX) => {
    'worklet';
    // This runs on JS thread via runOnJS — but we can also make a simple version
    const x = absX - PAD_LEFT; // scroll offset handled separately
    const count = cardsRef.current?.length || 0;
    if (count === 0) return -1;
    const idx = Math.floor(x / CARD_STEP);
    return Math.max(0, Math.min(idx, count - 1));
  }, []);

  // JS-thread: handle card selection
  const selectCardAtIndex = useCallback((idx) => {
    const cards = cardsRef.current;
    if (idx >= 0 && idx < cards.length) {
      hapticSelection();
      onSelectCardRef.current?.(cards[idx]);
    }
  }, []);

  // JS-thread: compute index and update hover shared value
  const prevHoverRef = useRef(-1);
  const updateHoverFromX = useCallback((absX) => {
    const x = absX + scrollOffsetRef.current - PAD_LEFT;
    const count = cardsRef.current?.length || 0;
    if (count === 0) return;
    const idx = Math.max(0, Math.min(Math.floor(x / CARD_STEP), count - 1));
    if (idx !== prevHoverRef.current) {
      prevHoverRef.current = idx;
      hapticSelection(); // haptic tick as finger moves across cards
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
    const x = absX + scrollOffsetRef.current - PAD_LEFT;
    const count = cardsRef.current?.length || 0;
    if (count === 0) return;
    const idx = Math.max(0, Math.min(Math.floor(x / CARD_STEP), count - 1));
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
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.x; }}
          contentContainerStyle={styles.listContent}
        >
          {displayCards.map((card, i) => {
            const key = cardKey(card);
            const playable = !isMyTurn || isCardInList(card, validPlays);
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
              />
            );
          })}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * AnimatedCard — individual card in the fan that rises when hovered.
 */
function AnimatedCard({ index, card, playable, isMyTurn, isIntended, hoveredIndex }) {
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
    <Animated.View style={[styles.cardWrap, isIntended && styles.cardWrapIntended, animStyle]}>
      <CardFace
        card={card}
        width={CARD_W}
        disabled={!playable}
        selected={isIntended}
        playable={playable && isMyTurn}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingLeft: PAD_LEFT,
    paddingRight: PAD_LEFT + OVERLAP,  // compensate last card's negative marginRight
    paddingVertical: 6,
    paddingTop: RISE_PX + 6,  // room for cards to rise without clipping
  },
  cardWrap: {
    marginRight: -OVERLAP,
  },
  cardWrapIntended: {
    transform: [{ translateY: -10 }],
    zIndex: 2,
    marginRight: -4,
  },
});
