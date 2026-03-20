import { StyleSheet, View } from 'react-native';
import { cardTokens } from '../../styles/theme';

/**
 * CardBack – renders a face-down card matching the web client design.
 *
 * Uses a dark blue background with gold diamond accent and border,
 * approximating the web's linear-gradient(135deg, #1a2a3a, #0f1a24).
 *
 * Props
 * ─────
 * width  {number} – card width in px; height derived from 5:7 ratio (default 56)
 */
export default function CardBack({ width = cardTokens.sizes.hand.width }) {
  const height = Math.round(width * cardTokens.ratio);
  const scale = width / cardTokens.sizes.hand.width;

  // Scale inner padding + diamond proportionally
  const innerMargin = Math.max(3, Math.round(4 * scale));
  const diamondSize = Math.max(10, Math.round(16 * scale));
  const crossBarThick = Math.max(1, Math.round(1 * scale));

  return (
    <View
      style={[
        styles.card,
        cardTokens.backShadow,
        { width, height },
      ]}
    >
      {/* Inner panel – simulates the darker half of the gradient */}
      <View style={[styles.inner, { margin: innerMargin, borderRadius: cardTokens.borderRadius - 2 }]}>
        {/* Crosshatch lines */}
        <View style={[styles.crossH, { height: crossBarThick }]} />
        <View style={[styles.crossV, { width: crossBarThick }]} />

        {/* Gold diamond center accent */}
        <View
          style={[
            styles.diamond,
            {
              width: diamondSize,
              height: diamondSize,
              borderRadius: Math.max(1, Math.round(2 * scale)),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cardTokens.borderRadius,
    borderWidth: 1,
    borderColor: cardTokens.backBorder,
    backgroundColor: cardTokens.backBgOuter,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    backgroundColor: cardTokens.backBgInner,
    borderWidth: 1,
    borderColor: cardTokens.backBorder,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Crosshatch decoration
  crossH: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: cardTokens.backBorder,
  },
  crossV: {
    ...StyleSheet.absoluteFillObject,
    left: '50%',
    backgroundColor: cardTokens.backBorder,
  },

  diamond: {
    backgroundColor: cardTokens.backAccent,
    transform: [{ rotate: '45deg' }],
    opacity: 0.85,
  },
});
