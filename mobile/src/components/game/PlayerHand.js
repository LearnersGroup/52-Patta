import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { WsPlayCard } from '../../api/wsEmitters';
import { toggleHandSort } from '../../redux/slices/game';
import {
  buttonStyles,
  cardTokens,
  colors,
  spacing,
  typography,
} from '../../styles/theme';
import { hapticSelection, hapticSuccess, hapticWarning } from '../../utils/haptics';
import CardFace from './CardFace';
import { cardKey, isCardInList, sortCardsBySuit } from './utils/cardMapper';

export default function PlayerHand({ cards = [], validPlays = [], isMyTurn = false }) {
  const dispatch = useDispatch();
  const handSorted = useSelector((state) => state.game.handSorted);
  const [selectedCardKey, setSelectedCardKey] = useState(null);

  const displayCards = useMemo(() => {
    return handSorted ? sortCardsBySuit(cards) : cards;
  }, [cards, handSorted]);

  const onCardPress = (card) => {
    hapticSelection();
    const key = cardKey(card);

    if (!isMyTurn) {
      setSelectedCardKey(key);
      hapticWarning();
      return;
    }

    const playable = isCardInList(card, validPlays);
    setSelectedCardKey(key);

    if (playable) {
      WsPlayCard(card);
      hapticSuccess();
    } else {
      hapticWarning();
    }
  };

  if (!displayCards.length) return null;

  return (
    <View style={styles.container}>
      {/* Gradient-ish tint at the bottom via bgDeep overlay */}
      <View style={styles.gradientTint} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Hand</Text>
        <Pressable
          style={[
            buttonStyles.base,
            buttonStyles.secondary,
            buttonStyles.small,
            styles.sortButton,
          ]}
          onPress={() => dispatch(toggleHandSort())}
        >
          <Text style={[buttonStyles.secondaryText, buttonStyles.smallText]}>
            {handSorted ? 'Natural Order' : 'Sort by Suit'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={displayCards}
        keyExtractor={cardKey}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const key = cardKey(item);
          const playable = !isMyTurn || isCardInList(item, validPlays);
          const selected = selectedCardKey === key;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.cardPressable,
                selected && styles.cardPressableSelected,
                pressed && styles.cardPressablePressed,
              ]}
              onPress={() => onCardPress(item)}
            >
              <CardFace
                card={item}
                width={cardTokens.sizes.hand.width}
                disabled={!playable}
                selected={selected}
                playable={playable && isMyTurn}
              />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 14,
    backgroundColor: colors.bgPanel,
    padding: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
  },

  // Approximates linear-gradient(0deg, #080f0a 40%, transparent)
  gradientTint: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: colors.bgDeep,
    opacity: 0.6,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: typography.body.fontSize,
  },
  sortButton: {
    borderRadius: 7,
  },

  listContent: {
    paddingRight: spacing.sm,
    paddingLeft: spacing.xs,
    zIndex: 1,
  },

  // Overlapping cards with negative margin
  cardPressable: {
    marginRight: -18,
    paddingBottom: spacing.xs,
  },
  cardPressableSelected: {
    transform: [{ translateY: -8 }],
    zIndex: 2,
  },
  cardPressablePressed: {
    opacity: 0.85,
  },
});
