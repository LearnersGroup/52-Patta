import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cardTokens, colors, fonts } from '../../../styles/theme';
import CardBack from '../CardBack';
import CardFace from '../CardFace';
import PlayerHand from '../PlayerHand';
import { sortCardsBySuit } from '../utils/cardMapper';

const FLIP_MS = 350;
const HOLD_MS = 500;
const MOVE_MS = 350;
const FADE_MS = 400;

/**
 * DealRevealOverlay
 *
 * After dealing, presents each card face-down in the centre of the screen.
 * The player taps to flip, and the card animates down into a growing hand
 * at the bottom.  After the last card settles the player taps once more to
 * dismiss the backdrop.
 *
 * If `durationMs` elapses before all cards are revealed, the overlay
 * auto-reveals all remaining cards and dismisses immediately.
 */
export default function DealRevealOverlay({ visible, cards = [], durationMs = 10000, onClose }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const sortedCards = useMemo(() => sortCardsBySuit(cards || []), [cards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [settledCards, setSettledCards] = useState([]);
  // idle → flipped → moving → (next idle… ) → complete → done
  const phaseRef = useRef('idle');
  const [renderTick, setRenderTick] = useState(0);
  const holdTimerRef = useRef(null);
  const timeoutRef = useRef(null);

  // ── Card dimensions ─────────────────────────────────────────────────────
  const bigW = Math.round(screenW * 0.50);
  const bigH = Math.round(bigW * cardTokens.ratio);
  const smallW = cardTokens.sizes.hand.width;
  const smallH = cardTokens.sizes.hand.height;

  // ── Positions ───────────────────────────────────────────────────────────
  const cardLeft = (screenW - bigW) / 2;
  const startTop = Math.round(screenH * 0.25);
  const endTop = screenH - 20 - smallH / 2 - bigH / 2;

  // ── Shared animation values ─────────────────────────────────────────────
  const flip = useSharedValue(0);
  const move = useSharedValue(0);
  const backdropOp = useSharedValue(0);

  // ── Stable callback refs ────────────────────────────────────────────────
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const doClose = useCallback(() => onCloseRef.current?.(), []);

  const sortedCardsRef = useRef(sortedCards);
  sortedCardsRef.current = sortedCards;

  // ── Settle: card reached hand position ──────────────────────────────────
  const doSettle = useCallback(() => {
    setCurrentIndex((prevIdx) => {
      const card = sortedCardsRef.current[prevIdx];
      if (card) {
        setSettledCards((prev) => sortCardsBySuit([...prev, card]));
      }

      const nextIdx = prevIdx + 1;
      if (nextIdx >= sortedCardsRef.current.length) {
        // Last card settled — wait for user tap before fading
        phaseRef.current = 'complete';
        setRenderTick((n) => n + 1);
      } else {
        phaseRef.current = 'idle';
        flip.value = 0;
        move.value = 0;
        setRenderTick((n) => n + 1);
      }
      return nextIdx;
    });
  }, [flip, move]);

  // ── Dismiss: fade backdrop and close ────────────────────────────────────
  const doDismiss = useCallback(() => {
    if (phaseRef.current === 'done') return;
    phaseRef.current = 'done';
    clearTimeout(timeoutRef.current);
    setRenderTick((n) => n + 1);
    backdropOp.value = withTiming(0, { duration: FADE_MS }, (fin) => {
      if (fin) runOnJS(doClose)();
    });
  }, [backdropOp, doClose]);

  // ── Move: shrink + slide card to hand ───────────────────────────────────
  const doMove = useCallback(() => {
    if (phaseRef.current !== 'flipped') return;
    clearTimeout(holdTimerRef.current);
    phaseRef.current = 'moving';
    setRenderTick((n) => n + 1);
    move.value = withTiming(
      1,
      { duration: MOVE_MS, easing: Easing.inOut(Easing.cubic) },
      (fin) => { if (fin) runOnJS(doSettle)(); },
    );
  }, [doSettle, move]);

  // ── Auto-reveal on timeout ──────────────────────────────────────────────
  const autoRevealAll = useCallback(() => {
    if (phaseRef.current === 'done') return;
    clearTimeout(holdTimerRef.current);
    // Reveal all remaining cards at once
    setSettledCards(sortCardsBySuit([...sortedCardsRef.current]));
    setCurrentIndex(sortedCardsRef.current.length);
    // Immediately dismiss
    phaseRef.current = 'done';
    setRenderTick((n) => n + 1);
    backdropOp.value = withTiming(0, { duration: FADE_MS }, (fin) => {
      if (fin) runOnJS(doClose)();
    });
  }, [backdropOp, doClose]);

  // ── Reset on open ───────────────────────────────────────────────────────
  useEffect(() => {
    if (visible && sortedCards.length > 0) {
      setCurrentIndex(0);
      setSettledCards([]);
      phaseRef.current = 'idle';
      flip.value = 0;
      move.value = 0;
      backdropOp.value = 0;
      backdropOp.value = withTiming(1, { duration: 250 });
      setRenderTick((n) => n + 1);

      // Start the overall reveal timer
      clearTimeout(timeoutRef.current);
      const dur = Math.max(0, Number(durationMs) || 10000);
      timeoutRef.current = setTimeout(autoRevealAll, dur);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [visible]);

  // ── Cleanup hold timer ──────────────────────────────────────────────────
  useEffect(() => () => clearTimeout(holdTimerRef.current), []);

  // ── Tap handler ─────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const phase = phaseRef.current;
    if (phase === 'idle') {
      phaseRef.current = 'flipped';
      setRenderTick((n) => n + 1);
      flip.value = withTiming(1, { duration: FLIP_MS, easing: Easing.inOut(Easing.ease) });
      holdTimerRef.current = setTimeout(doMove, HOLD_MS);
    } else if (phase === 'flipped') {
      doMove();
    } else if (phase === 'complete') {
      doDismiss();
    }
  }, [doMove, doDismiss, flip]);

  // ── Animated styles ─────────────────────────────────────────────────────
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOp.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => {
    const p = move.value;
    const scale = 1 + p * (smallW / bigW - 1);
    const top = startTop + p * (endTop - startTop);
    return {
      position: 'absolute',
      left: cardLeft,
      top,
      width: bigW,
      height: bigH,
      transform: [{ scale }],
    };
  });

  const backFlipStyle = useAnimatedStyle(() => ({
    opacity: flip.value <= 0.5 ? 1 : 0,
    transform: [{ scaleX: Math.max(0, 1 - flip.value * 2) }],
  }));

  const faceFlipStyle = useAnimatedStyle(() => ({
    opacity: flip.value > 0.5 ? 1 : 0,
    transform: [{ scaleX: Math.max(0, flip.value * 2 - 1) }],
  }));

  // ── Render ──────────────────────────────────────────────────────────────
  if (!visible || sortedCards.length === 0) return null;

  const currentCard = currentIndex < sortedCards.length ? sortedCards[currentIndex] : null;
  const phase = phaseRef.current;
  const showCard = (phase === 'idle' || phase === 'flipped' || phase === 'moving') && currentCard;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

      {/* Tap area */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
        {/* Big card — flip + move animation */}
        {showCard ? (
          <>
            <Animated.View style={cardAnimStyle}>
              <Animated.View style={[StyleSheet.absoluteFill, backFlipStyle]}>
                <CardBack width={bigW} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, faceFlipStyle]}>
                <CardFace card={currentCard} width={bigW} />
              </Animated.View>
            </Animated.View>

            {/* Progress / instruction */}
            <View style={[styles.progressWrap, { top: startTop + bigH + 20 }]}>
              <Text style={styles.progressText}>
                {phase === 'idle'
                  ? `Tap to reveal  ·  ${currentIndex + 1}/${sortedCards.length}`
                  : `${currentIndex + 1} / ${sortedCards.length}`}
              </Text>
            </View>
          </>
        ) : null}

        {/* "Tap to continue" prompt after last card */}
        {phase === 'complete' ? (
          <View style={styles.completeWrap}>
            <Text style={styles.completeText}>Tap to continue</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Settled hand — uses the real PlayerHand component for pixel-perfect alignment */}
      <View style={styles.settledHand} pointerEvents="none">
        <PlayerHand cards={settledCards} validPlays={[]} isMyTurn={false} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  progressWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressText: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  completeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    fontFamily: fonts.heading,
    color: colors.goldLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  settledHand: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
