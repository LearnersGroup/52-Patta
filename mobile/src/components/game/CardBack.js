import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cardTokens } from '../../styles/theme';

/**
 * Card back SVG from @letele/playing-cards (B1).
 * Same asset the web client uses via `deck.B1`.
 */
const CARD_BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="336" preserveAspectRatio="none" viewBox="-120 -168 240 336" width="240"><defs><pattern id="cb_a" width="6" height="6" patternUnits="userSpaceOnUse"><path d="m3 0 3 3-3 3-3-3Z"/></pattern></defs><rect width="239" height="335" x="-119.5" y="-167.5" rx="12" ry="12" fill="#fff" stroke="#000"/><rect fill="url(#cb_a)" width="216" height="312" x="-108" y="-156" rx="12" ry="12"/></svg>`;

/**
 * CardBack – renders the library card back (B1) using SvgXml.
 *
 * Props
 * ─────
 * width  {number} – card width in px; height derived from 5:7 ratio (default 56)
 */
export default function CardBack({ width = cardTokens.sizes.hand.width }) {
  const height = Math.round(width * cardTokens.ratio);
  const borderRadius = Math.round(cardTokens.borderRadius * width / cardTokens.sizes.hand.width);

  return (
    <View style={[styles.card, cardTokens.backShadow, { width, height, borderRadius }]}>
      <SvgXml xml={CARD_BACK_SVG} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cardTokens.borderRadius,
    overflow: 'hidden',
  },
});
