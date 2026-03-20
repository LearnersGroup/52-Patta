import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, modalOverlayStyle, panelStyle, spacing, typography } from '../../../styles/theme';
import CardBack from '../CardBack';
import CardFace from '../CardFace';
import { sortCardsBySuit } from '../utils/cardMapper';

function RevealCard({ card, revealed, width = 50, index }) {
  const flip = useSharedValue(0);

  useEffect(() => {
    if (revealed) {
      flip.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    } else {
      flip.value = 0;
    }
  }, [revealed, flip]);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value > 0.5 ? 1 : 0,
    transform: [{ scaleX: flip.value > 0.5 ? 1 : 0 }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value <= 0.5 ? 1 : 0,
    transform: [{ scaleX: flip.value <= 0.5 ? 1 : 0 }],
  }));

  return (
    <View style={styles.cardSlot}>
      <Animated.View style={[styles.cardLayer, backStyle]}>
        <CardBack width={width} />
      </Animated.View>
      <Animated.View style={[styles.cardLayer, frontStyle]}>
        <CardFace card={card} width={width} />
      </Animated.View>
    </View>
  );
}

export default function DealRevealOverlay({ visible, cards = [], durationMs = 8000, onClose }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const sortedCards = useMemo(() => sortCardsBySuit(cards || []), [cards]);

  useEffect(() => {
    if (!visible) {
      setRevealedCount(0);
      return;
    }

    setRevealedCount(0);
    const stepTimer = setInterval(() => {
      setRevealedCount((count) => {
        if (count >= sortedCards.length) return count;
        return count + 1;
      });
    }, 90);

    const closeTimer = setTimeout(() => {
      onClose?.();
    }, durationMs);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(closeTimer);
    };
  }, [visible, sortedCards.length, durationMs, onClose]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>Your hand is ready</Text>
          <Text style={styles.subtitle}>Tap anywhere to continue</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {sortedCards.map((card, idx) => (
              <RevealCard
                key={`${card?.suit}${card?.rank}_${card?.deckIndex ?? idx}`}
                card={card}
                revealed={idx < revealedCount}
                index={idx}
              />
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...modalOverlayStyle,
    padding: spacing.lg,
  },
  panel: {
    ...panelStyle,
    width: '100%',
    maxWidth: 380,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
    textAlign: 'center',
    fontSize: 15,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardsRow: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cardSlot: {
    marginRight: -15,
    paddingBottom: spacing.xs,
    width: 50,
    height: 73,
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
