/**
 * AppBackground — shared page background matching the web client's casino theme.
 *
 * Layers (bottom → top):
 *  1. Deep dark base (#080f0a)
 *  2. Green radial-style gradient (top glow + bottom fade)
 *  3. Slanted gold stripe texture (45°, matching web CSS repeating-linear-gradient)
 *  4. Children (with safe-area top inset applied)
 *
 * Props:
 *  - children
 *  - style        — extra styles on the root View
 *  - center       — if true, children are vertically + horizontally centred
 */
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { colors } from '../../styles/theme';

// Draws explicit 45° diagonal lines across the full screen.
// Avoids <Pattern patternTransform> which is unreliable in react-native-svg.
const LINE_SPACING = 56; // px between lines (matches web's 40 px gap at 45°)
const LINE_COLOR   = 'rgba(201,162,39,0.07)';

function SlantedLines() {
  const { width, height } = useWindowDimensions();

  // A 45° line satisfies  x - y = c.
  // At y=0 → x=c;  at y=height → x = c + height.
  // We need c from -height (so the line enters from the left edge)
  // up to width + height (so the last line exits off the right edge).
  const lines = [];
  for (let c = -height; c <= width + height; c += LINE_SPACING) {
    lines.push(
      <Line
        key={c}
        x1={c}          y1={0}
        x2={c + height} y2={height}
        stroke={LINE_COLOR}
        strokeWidth="1"
      />
    );
  }

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
      {lines}
    </Svg>
  );
}

export default function AppBackground({ children, style, center = false }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, style]}>
      {/* Layer 1: deep dark base */}
      <View style={[StyleSheet.absoluteFill, styles.base]} />

      {/* Layer 2: green glow at top, dark fade at bottom */}
      <LinearGradient
        colors={[
          'rgba(30,77,42,0.35)',
          'rgba(8,15,10,0.0)',
          'rgba(8,15,10,0.6)',
        ]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 3: slanted gold lines */}
      <SlantedLines />

      {/* Layer 4: content — always respects Dynamic Island / notch */}
      <View
        style={[
          styles.children,
          { paddingTop: insets.top },
          center && styles.centered,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  base: {
    backgroundColor: colors.bgDeep,
  },
  children: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
