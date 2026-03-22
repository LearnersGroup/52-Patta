import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, shadows, spacing, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

/**
 * PartnerCardDisplay – shows partner cards in the top-right of the HUD area.
 * When multiple partner cards exist they are stacked; tap to expand.
 */
export default function PartnerCardDisplay({ partnerCards = [], powerHouseSuit, getName }) {
  const [expanded, setExpanded] = useState(false);

  if (!partnerCards?.length) return null;

  const toggle = () => setExpanded((p) => !p);
  const showStack = partnerCards.length > 1 && !expanded;

  return (
    <View style={styles.wrap}>
      {showStack ? (
        /* ── Stacked (collapsed) view ── */
        <Pressable style={styles.stack} onPress={toggle}>
          {partnerCards.slice(0, 3).map((pc, i) => (
            <View
              key={`${pc?.card?.suit}${pc?.card?.rank}_${i}`}
              style={[
                styles.stackCard,
                { top: i * 3, left: i * 4, zIndex: partnerCards.length - i },
              ]}
            >
              <CardFace card={pc.card} width={30} />
            </View>
          ))}
          <View style={styles.stackCount}>
            <Text style={styles.stackCountText}>{partnerCards.length}</Text>
          </View>
        </Pressable>
      ) : (
        /* ── Expanded view ── */
        <Pressable style={styles.cardsRow} onPress={partnerCards.length > 1 ? toggle : undefined}>
          {partnerCards.map((pc, idx) => {
            const revealed = pc?.revealed;
            const label = revealed ? (getName?.(pc.partnerId) || 'Partner') : '????';
            return (
              <View key={`${pc?.card?.suit}${pc?.card?.rank}_${idx}`} style={styles.cardSlot}>
                {pc?.card ? <CardFace card={pc.card} width={30} /> : null}
                <Text numberOfLines={1} style={[styles.cardLabel, revealed && styles.cardLabelRevealed]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  /* ── Stacked cards ── */
  stack: {
    width: 44,
    height: 50,
    position: 'relative',
  },
  stackCard: {
    position: 'absolute',
  },
  stackCount: {
    position: 'absolute',
    bottom: -2,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    ...shadows.shallow,
  },
  stackCountText: {
    fontFamily: fonts.heading,
    fontSize: 8,
    fontWeight: '700',
    color: colors.goldLight,
  },
  /* ── Expanded row ── */
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardSlot: {
    alignItems: 'center',
    gap: 2,
  },
  cardLabel: {
    fontSize: 7,
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 36,
  },
  cardLabelRevealed: {
    fontStyle: 'normal',
    color: colors.ready,
    fontWeight: '700',
  },
});
