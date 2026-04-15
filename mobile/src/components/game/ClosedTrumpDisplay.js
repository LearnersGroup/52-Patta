import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardTokens, colors, fonts } from '../../styles/theme';
import CardBack from './CardBack';
import CardFace from './CardFace';

/**
 * Small fixed indicator (top-right) showing the hidden trump card.
 * When the trump is revealed, this flips to a face-up card.
 */
const ClosedTrumpDisplay = memo(({ placeholder, revealed = false, card = null }) => {
  const holderName = placeholder?.holderName || 'Player';
  const CARD_W = cardTokens.sizes.hand.width * 0.65; // ~36 px

  return (
    <View style={styles.wrap}>
      {revealed && card ? (
        <CardFace card={card} width={CARD_W} />
      ) : (
        <CardBack width={CARD_W} />
      )}
      <Text style={styles.label} numberOfLines={2}>
        {holderName}{revealed ? "'s revealed trump" : "'s trump"}
      </Text>
    </View>
  );
});

ClosedTrumpDisplay.displayName = 'ClosedTrumpDisplay';
export default ClosedTrumpDisplay;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 68,
    right: 12,
    alignItems: 'center',
    gap: 3,
    zIndex: 10,
  },
  label: {
    fontSize: 9,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    textAlign: 'center',
    maxWidth: 52,
    lineHeight: 12,
  },
});
