import { StyleSheet, Text, View } from 'react-native';
import { cardTokens } from '../../styles/theme';
import { isRedSuit, suitSymbol } from './utils/cardMapper';

/**
 * CardFace – renders a playing card face matching the web client design.
 *
 * Props
 * ─────
 * card      {object}  – { rank, suit, deckIndex }
 * width     {number}  – card width in px; height derived from 5:7 ratio (default 56)
 * disabled  {boolean} – dim the card (non-playable)
 * selected  {boolean} – highlight border (selected / hovered)
 * playable  {boolean} – green border glow for valid plays
 */
export default function CardFace({
  card,
  width = cardTokens.sizes.hand.width,
  disabled = false,
  selected = false,
  playable = false,
}) {
  const rank = card?.rank || '?';
  const suit = card?.suit || '?';
  const red = isRedSuit(suit);
  const height = Math.round(width * cardTokens.ratio);

  // Scale font sizes proportionally to the hand-card baseline (56px wide)
  const scale = width / cardTokens.sizes.hand.width;
  const cornerFontSize = Math.round(10 * scale);
  const centerFontSize = Math.round(26 * scale);
  const cornerLineHeight = Math.round(13 * scale);
  const padH = Math.max(3, Math.round(5 * scale));
  const padV = Math.max(2, Math.round(4 * scale));

  const suitColor = red
    ? { color: cardTokens.redSuit }
    : { color: cardTokens.blackSuit };

  return (
    <View
      style={[
        styles.card,
        cardTokens.faceShadow,
        { width, height, paddingHorizontal: padH, paddingVertical: padV },
        playable && styles.cardPlayable,
        selected && playable && styles.cardPlayableActive,
        disabled && styles.cardDisabled,
      ]}
    >
      {/* Top-left corner: rank + small suit */}
      <View style={styles.corner}>
        <Text style={[styles.cornerRank, suitColor, { fontSize: cornerFontSize, lineHeight: cornerLineHeight }]}>
          {rank}
        </Text>
        <Text style={[styles.cornerSuit, suitColor, { fontSize: cornerFontSize, lineHeight: cornerLineHeight }]}>
          {suitSymbol(suit)}
        </Text>
      </View>

      {/* Large centered suit symbol */}
      <Text style={[styles.suitCenter, suitColor, { fontSize: centerFontSize }]}>
        {suitSymbol(suit)}
      </Text>

      {/* Bottom-right corner: rank + small suit (rotated 180deg) */}
      <View style={[styles.corner, styles.cornerBottom]}>
        <Text style={[styles.cornerRank, suitColor, { fontSize: cornerFontSize, lineHeight: cornerLineHeight }]}>
          {rank}
        </Text>
        <Text style={[styles.cornerSuit, suitColor, { fontSize: cornerFontSize, lineHeight: cornerLineHeight }]}>
          {suitSymbol(suit)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cardTokens.borderRadius,
    borderWidth: 1,
    borderColor: cardTokens.faceBorder,
    backgroundColor: cardTokens.faceBg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  // --- Playable / selected states ---
  cardPlayable: {
    borderWidth: 2,
    borderColor: cardTokens.playableBorder,
  },
  cardPlayableActive: {
    borderColor: cardTokens.playableActiveBorder,
    ...cardTokens.playableGlow,
  },
  cardDisabled: {
    opacity: cardTokens.disabledOpacity,
  },

  // --- Corner layout ---
  corner: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  cornerBottom: {
    alignSelf: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  cornerRank: {
    fontWeight: '700',
  },
  cornerSuit: {
    fontWeight: '700',
    marginTop: -2,
  },

  // --- Center suit ---
  suitCenter: {
    textAlign: 'center',
    fontWeight: '700',
  },
});
