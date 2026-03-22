import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cardTokens } from '../../styles/theme';
import CARD_SVGS from './utils/cardSvgs';

const RANK_MAP = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'j', Q: 'q', K: 'k', A: 'a',
};

/**
 * CardFace – renders a playing card using the same @letele/playing-cards SVG
 * library as the web client. The SVGs are pre-generated at build time and
 * embedded in cardSvgs.js so the render is instant with no network requests.
 *
 * Props
 * ─────
 * card      { rank, suit, deckIndex }
 * width     number  – card width; height derived from 5:7 ratio (default 56)
 * disabled  boolean – dims the card (non-playable)
 * selected  boolean – highlights border when user taps
 * playable  boolean – green glow border for valid plays
 */
export default function CardFace({
  card,
  width    = cardTokens.sizes.hand.width,
  disabled = false,
  selected = false,
  playable = false,
}) {
  const key    = card ? card.suit + (RANK_MAP[card.rank] ?? card.rank) : null;
  const xml    = key ? CARD_SVGS[key] : null;
  const height = Math.round(width * cardTokens.ratio);

  if (!xml) return null;

  return (
    <View
      style={[
        styles.card,
        cardTokens.faceShadow,
        { width, height },
        playable                && styles.cardPlayable,
        selected && playable    && styles.cardPlayableActive,
        disabled                && styles.cardDisabled,
      ]}
    >
      <SvgXml xml={xml} width={width} height={height} />
      {disabled ? <View style={styles.dimOverlay} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cardTokens.borderRadius,
    overflow: 'hidden',
  },
  cardPlayable: {
    borderWidth: 2,
    borderColor: cardTokens.playableBorder,
    borderRadius: cardTokens.borderRadius + 1,
  },
  cardPlayableActive: {
    borderColor: cardTokens.playableActiveBorder,
    ...cardTokens.playableGlow,
  },
  cardDisabled: {
    transform: [{ translateY: 6 }],
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: cardTokens.borderRadius,
  },
});
