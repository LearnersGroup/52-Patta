import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardTokens, colors, fonts } from '../../styles/theme';
import CardBack from './CardBack';

/**
 * Small fixed indicator (top-right) showing a face-down trump card
 * during band-hukum mode while trump is still hidden.
 */
const ClosedTrumpDisplay = memo(({ placeholder }) => {
  const holderName = placeholder?.holderName || 'Player';
  const CARD_W = cardTokens.sizes.hand.width * 0.65; // ~36 px

  return (
    <View style={styles.wrap}>
      <CardBack width={CARD_W} />
      <Text style={styles.label} numberOfLines={2}>
        {holderName}{'\'s trump'}
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
