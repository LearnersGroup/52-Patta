import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, shadows, spacing, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

const CARD_WIDTH = 35; // 15% larger than original 30

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
              <CardFace card={pc.card} width={CARD_WIDTH} />
              {pc?.whichCopy != null && (
                <View style={styles.copyToken}>
                  <Text style={styles.copyTokenText}>
                    {pc.whichCopy === '1st' ? '1' : '2'}
                  </Text>
                </View>
              )}
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
                <View style={styles.cardFaceWrap}>
                  {pc?.card ? <CardFace card={pc.card} width={CARD_WIDTH} /> : null}
                  {pc?.whichCopy != null && (
                    <View style={styles.copyToken}>
                      <Text style={styles.copyTokenText}>
                        {pc.whichCopy === '1st' ? '1' : '2'}
                      </Text>
                    </View>
                  )}
                </View>
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
    width: 51,
    height: 57,
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
  /* ── Card face wrapper (for token overlay) ── */
  cardFaceWrap: {
    position: 'relative',
  },
  /* ── Circular copy token (1 or 2) shown on card in 2-deck games ── */
  copyToken: {
    position: 'absolute',
    bottom: 3,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: 'rgba(20,12,4,0.88)',
    borderWidth: 1.5,
    borderColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  copyTokenText: {
    fontSize: 7,
    fontFamily: fonts.body,
    fontWeight: '700',
    color: colors.goldLight,
    lineHeight: 9,
    textAlign: 'center',
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
    maxWidth: 41,
  },
  cardLabelRevealed: {
    fontStyle: 'normal',
    color: colors.ready,
    fontWeight: '700',
  },
});
