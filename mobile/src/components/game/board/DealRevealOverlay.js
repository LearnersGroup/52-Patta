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
const MOVE_MS = 200;
const FADE_MS = 400;
const PAUSE_MS = 500;

/**
 * Shuffle an array using Fisher-Yates (returns new array).
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * DealRevealOverlay
 *
 * After dealing, presents each card face-down in the centre of the screen.
 * Cards are revealed in random order. The player taps to flip, taps again
 * to move the card to hand and show the next. After the last card settles
 * the player taps once more to dismiss the backdrop.
 *
 * Shows a "next card" back underneath the current card (when not the last).
 * The settled hand at the bottom is always sorted.
 *
 * If `durationMs` elapses before all cards are revealed, the overlay
 * auto-reveals all remaining cards and dismisses immediately.
 */
export default function DealRevealOverlay({ visible, cards = [], durationMs = 10000, onClose }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const sortedCards = useMemo(() => sortCardsBySuit(cards || []), [cards]);

  // Random reveal order — computed once when overlay opens
  const [revealOrder, setRevealOrder] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settledCards, setSettledCards] = useState([]);
  // idle → flipped → moving → (next idle…) → complete → done
  const phaseRef = useRef('idle');
  const [renderTick, setRenderTick] = useState(0);
  const timeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);

  // ── Card dimensions ─────────────────────────────────────────────────────
  const bigW = Math.round(screenW * 0.50);
  const bigH = Math.round(bigW * cardTokens.ratio);

  // ── Positions ───────────────────────────────────────────────────────────
  const cardLeft = (screenW - bigW) / 2;
  const startTop = Math.round(screenH * 0.25);
  const smallW = cardTokens.sizes.hand.width;
  const smallH = cardTokens.sizes.hand.height;
  const endTop = screenH - 20 - smallH / 2 - bigH / 2;

  // ── Shared animation values ─────────────────────────────────────────────
  const flip = useSharedValue(0);
  const move = useSharedValue(0);
  const backdropOp = useSharedValue(0);

  // ── Stable callback refs ──────────────────────────────────────────────
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const doClose = useCallback(() => onCloseRef.current?.(), []);

  const revealOrderRef = useRef(revealOrder);
  revealOrderRef.current = revealOrder;

  // ── Settle: card reached hand position ──────────────────────────────────
  const doSettle = useCallback(() => {
    setCurrentIndex((prevIdx) => {
      const card = revealOrderRef.current[prevIdx];
      if (card) {
        setSettledCards((prev) => sortCardsBySuit([...prev, card]));
      }

      const nextIdx = prevIdx + 1;
      if (nextIdx >= revealOrderRef.current.length) {
        // Last card settled — wait for user tap before fading
        phaseRef.current = 'complete';
        setRenderTick((n) => n + 1);
      } else {
        // Reset to idle — user taps to reveal next card
        move.value = 0;
        flip.value = 0;
        phaseRef.current = 'idle';
        setRenderTick((n) => n + 1);
      }
      return nextIdx;
    });
  }, [flip, move]);

  // ── Dismiss: fade backdrop and close ──────────────────────────────────
  const doDismiss = useCallback(() => {
    if (phaseRef.current === 'done') return;
    phaseRef.current = 'done';
    clearTimeout(timeoutRef.current);
    setRenderTick((n) => n + 1);
    backdropOp.value = withTiming(0, { duration: FADE_MS }, (fin) => {
      if (fin) runOnJS(doClose)();
    });
  }, [backdropOp, doClose]);

  // ── Move: shrink + slide card to hand ─────────────────────────────────
  const doMove = useCallback(() => {
    if (phaseRef.current !== 'flipped') return;
    phaseRef.current = 'moving';
    setRenderTick((n) => n + 1);
    move.value = withTiming(
      1,
      { duration: MOVE_MS, easing: Easing.inOut(Easing.cubic) },
      (fin) => { if (fin) runOnJS(doSettle)(); },
    );
  }, [doSettle, move]);

  // ── Auto-reveal on timeout ────────────────────────────────────────────
  const autoRevealAll = useCallback(() => {
    if (phaseRef.current === 'done') return;
    clearTimeout(timeoutRef.current);
    // Reveal all remaining cards at once
    setSettledCards(sortCardsBySuit([...sortedCards]));
    setCurrentIndex(sortedCards.length);
    // Immediately dismiss
    phaseRef.current = 'done';
    setRenderTick((n) => n + 1);
    backdropOp.value = withTiming(0, { duration: FADE_MS }, (fin) => {
      if (fin) runOnJS(doClose)();
    });
  }, [backdropOp, doClose, sortedCards]);

  // ── Reset on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (visible && sortedCards.length > 0) {
      const randomized = shuffle(sortedCards);
      setRevealOrder(randomized);
      revealOrderRef.current = randomized;
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
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(pauseTimeoutRef.current);
    };
  }, [visible]);

  // ── Schedule auto-move after pause ───────────────────────────────────
  const scheduleAutoMove = useCallback(() => {
    clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => doMove(), PAUSE_MS);
  }, [doMove]);

  // ── Tap handler ───────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const phase = phaseRef.current;
    if (phase === 'idle') {
      phaseRef.current = 'flipped';
      setRenderTick((n) => n + 1);
      flip.value = withTiming(1, { duration: FLIP_MS, easing: Easing.inOut(Easing.ease) }, (fin) => {
        if (fin) runOnJS(scheduleAutoMove)();
      });
    } else if (phase === 'flipped') {
      // Rapid tap — skip pause, move immediately
      clearTimeout(pauseTimeoutRef.current);
      doMove();
    } else if (phase === 'complete') {
      doDismiss();
    }
  }, [doMove, doDismiss, flip, scheduleAutoMove]);

  // ── Animated styles ───────────────────────────────────────────────────
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
      zIndex: 2,
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

  // ── Render ────────────────────────────────────────────────────────────
  if (!visible || sortedCards.length === 0) return null;

  const currentCard = currentIndex < revealOrder.length ? revealOrder[currentIndex] : null;
  const isLastCard = currentIndex >= revealOrder.length - 1;
  const phase = phaseRef.current;
  const showCard = (phase === 'idle' || phase === 'flipped' || phase === 'moving') && currentCard;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

      {/* Tap area */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
        {/* Next card back — peek underneath current card */}
        {showCard && !isLastCard ? (
          <View style={[styles.nextBackCard, { left: cardLeft, top: startTop, width: bigW, height: bigH }]}>
            <CardBack width={bigW} />
          </View>
        ) : null}

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
                  ? `Tap to reveal  ·  ${currentIndex + 1}/${revealOrder.length}`
                  : `${currentIndex + 1} / ${revealOrder.length}`}
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
  nextBackCard: {
    position: 'absolute',
    zIndex: 1,
    opacity: 0.5,
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
