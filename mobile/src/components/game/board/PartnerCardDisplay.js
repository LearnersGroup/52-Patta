import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, panelStyle, shadows, spacing, typography } from '../../../styles/theme';
import CardFace from '../CardFace';
import { isRedSuit, suitSymbol } from '../utils/cardMapper';

export default function PartnerCardDisplay({ partnerCards = [], powerHouseSuit, getName }) {
  if (!powerHouseSuit && !partnerCards?.length) return null;

  return (
    <View style={styles.wrap}>
      {powerHouseSuit ? (
        <View style={styles.powerWrap}>
          <Text style={styles.powerLabel}>POWERHOUSE</Text>
          <Text style={[styles.powerSuit, isRedSuit(powerHouseSuit) ? styles.red : styles.black]}>
            {suitSymbol(powerHouseSuit)}
          </Text>
        </View>
      ) : null}

      {partnerCards?.length ? (
        <View style={styles.cardsRow}>
          {partnerCards.map((pc, idx) => {
            const revealed = pc?.revealed;
            const label = revealed ? (getName?.(pc.partnerId) || 'Partner') : '????';
            return (
              <View key={`${pc?.card?.suit}${pc?.card?.rank}_${idx}`} style={styles.cardSlot}>
                {pc?.card ? <CardFace card={pc.card} width={36} /> : null}
                <Text numberOfLines={1} style={[styles.cardLabel, !revealed && styles.cardLabelUnrevealed]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  powerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  powerLabel: {
    ...typography.label,
    color: colors.goldLight,
    fontFamily: fonts.heading,
  },
  powerSuit: {
    fontSize: 18,
    fontWeight: '700',
  },
  red: {
    color: colors.redSuit,
  },
  black: {
    color: colors.cream,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  cardSlot: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  cardLabel: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  cardLabelUnrevealed: {
    fontStyle: 'italic',
    color: colors.creamMuted,
  },
});
