import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgUri, SvgXml } from 'react-native-svg';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../styles/theme';

// ---------------------------------------------------------------------------
// Options — mirrors web client AvatarCreator.jsx exactly
// ---------------------------------------------------------------------------

const FACE_OPTIONS = [
  'angryWithFang', 'awe', 'blank', 'calm', 'cheeky', 'concerned',
  'concernedFear', 'contempt', 'cute', 'cyclops', 'driven', 'eatingHappy',
  'explaining', 'eyesClosed', 'fear', 'hectic', 'lovingGrin1', 'lovingGrin2',
  'monster', 'old', 'rage', 'serious', 'smile', 'smileBig', 'smileLOL',
  'smileTeethGap', 'solemn', 'suspicious', 'tired', 'veryAngry',
];

const HEAD_OPTIONS = [
  'afro', 'bangs', 'bangs2', 'bantuKnots', 'bear', 'bun', 'bun2', 'buns',
  'cornrows', 'cornrows2', 'dreads1', 'dreads2', 'flatTop', 'flatTopLong',
  'grayBun', 'grayMedium', 'grayShort', 'hatBeanie', 'hatHip', 'hijab',
  'long', 'longAfro', 'longBangs', 'longCurly', 'medium1', 'medium2',
  'medium3', 'mediumBangs1', 'mediumBangs2', 'mediumBangs3', 'mediumStraight',
  'mohawk', 'mohawk2', 'noHair1', 'noHair2', 'noHair3', 'pomp', 'shaved1',
  'shaved2', 'shaved3', 'short1', 'short2', 'short3', 'short4', 'short5',
  'turban', 'twists', 'twists2',
];

const ACCESSORIES_VALUES = [
  'eyepatch', 'glasses', 'glasses2', 'glasses3', 'glasses4', 'glasses5',
  'sunglasses', 'sunglasses2',
];

const FACIAL_HAIR_VALUES = [
  'chin', 'full', 'full2', 'full3', 'full4', 'goatee1', 'goatee2',
  'moustache1', 'moustache2', 'moustache3', 'moustache4', 'moustache5',
  'moustache6', 'moustache7', 'moustache8', 'moustache9',
];

const SKIN_COLOR_SWATCHES = [
  { hex: '694d3d', label: 'Dark Brown' },
  { hex: 'ae5d29', label: 'Brown' },
  { hex: 'd08b5b', label: 'Medium' },
  { hex: 'edb98a', label: 'Light' },
  { hex: 'ffdbb4', label: 'Pale' },
];

const CLOTHING_COLOR_SWATCHES = [
  { hex: '1f2d3d', label: 'Midnight' },
  { hex: '264653', label: 'Teal' },
  { hex: '2a9d8f', label: 'Jade' },
  { hex: '457b9d', label: 'Steel Blue' },
  { hex: '6d6875', label: 'Mauve' },
  { hex: '8338ec', label: 'Purple' },
  { hex: 'c77dff', label: 'Lavender' },
  { hex: 'e63946', label: 'Red' },
  { hex: 'f4a261', label: 'Orange' },
  { hex: 'f1c40f', label: 'Yellow' },
  { hex: '2ecc71', label: 'Green' },
  { hex: 'ffffff', label: 'White' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const prettifyKey = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const randomSeed = () =>
  `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-5)}`;

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickRandomOrNone = (arr) => pickRandom(['', ...arr]);

const buildDiceBearUrl = ({ seed, face, head, accessories, facialHair, skinColor, clothingColor }) => {
  const params = new URLSearchParams({ seed, face, head, skinColor, clothingColor });
  if (accessories) {
    params.set('accessories', accessories);
    params.set('accessoriesProbability', '100');
  }
  if (facialHair) {
    params.set('facialHair', facialHair);
    params.set('facialHairProbability', '100');
  }
  return `https://api.dicebear.com/9.x/open-peeps/svg?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ChipRow({ label, options, selected, onSelect }) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <SectionLabel>{label}</SectionLabel>
        <Pressable onPress={() => onSelect(pickRandom(options))} style={styles.diceBtn}>
          <Text style={styles.diceBtnText}>🎲</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.chip, selected === opt && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>
              {prettifyKey(opt)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function OptionalChipRow({ label, options, selected, onSelect }) {
  // Includes a "None" chip
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <SectionLabel>{label}</SectionLabel>
        <Pressable onPress={() => onSelect(pickRandom(options))} style={styles.diceBtn}>
          <Text style={styles.diceBtnText}>🎲</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Pressable
          style={[styles.chip, selected === '' && styles.chipActive]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.chipText, selected === '' && styles.chipTextActive]}>None</Text>
        </Pressable>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[styles.chip, selected === opt && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>
              {prettifyKey(opt)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SwatchRow({ label, swatches, selected, onSelect }) {
  return (
    <View style={styles.fieldBlock}>
      <SectionLabel>{label}</SectionLabel>
      <View style={styles.swatchRow}>
        {swatches.map((s) => (
          <Pressable
            key={s.hex}
            onPress={() => onSelect(s.hex)}
            style={[
              styles.swatch,
              { backgroundColor: `#${s.hex}` },
              selected === s.hex && styles.swatchSelected,
            ]}
            accessibilityLabel={s.label}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AvatarCreator({ initialAvatar, onAvatarChange, onSeedChange }) {
  const [seed, setSeed]               = useState(() => randomSeed());
  const [face, setFace]               = useState(() => pickRandom(FACE_OPTIONS));
  const [head, setHead]               = useState(() => pickRandom(HEAD_OPTIONS));
  const [accessories, setAccessories] = useState('');
  const [facialHair, setFacialHair]   = useState('');
  const [skinColor, setSkinColor]     = useState('d08b5b');
  const [clothingColor, setClothingColor] = useState('264653');
  const [useGenerated, setUseGenerated]   = useState(!initialAvatar);
  const [loading, setLoading]             = useState(false);

  const avatarUrl = useMemo(
    () => buildDiceBearUrl({ seed, face, head, accessories, facialHair, skinColor, clothingColor }),
    [seed, face, head, accessories, facialHair, skinColor, clothingColor],
  );

  // Notify parent of seed changes
  useEffect(() => { onSeedChange?.(seed); }, [onSeedChange, seed]);

  // Fetch SVG and convert to data URI whenever URL changes
  const fetchAvatar = useCallback(async (url) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = await res.text();
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      onAvatarChange?.(dataUri);
    } catch {
      onAvatarChange?.(url); // Fall back to URL
    } finally {
      setLoading(false);
    }
  }, [onAvatarChange]);

  useEffect(() => {
    if (!useGenerated && initialAvatar) {
      onAvatarChange?.(initialAvatar);
      return;
    }
    fetchAvatar(avatarUrl);
  }, [avatarUrl, useGenerated, initialAvatar, fetchAvatar, onAvatarChange]);

  const randomizeAll = () => {
    setUseGenerated(true);
    setSeed(randomSeed());
    setFace(pickRandom(FACE_OPTIONS));
    setHead(pickRandom(HEAD_OPTIONS));
    setAccessories(pickRandomOrNone(ACCESSORIES_VALUES));
    setFacialHair(pickRandomOrNone(FACIAL_HAIR_VALUES));
  };

  const previewUri = useGenerated || !initialAvatar ? avatarUrl : initialAvatar;

  return (
    <View style={styles.container}>
      {/* Preview */}
      <View style={styles.preview}>
        {previewUri?.startsWith('data:image/svg+xml') ? (
          <SvgXml
            xml={decodeURIComponent(previewUri.replace(/^data:image\/svg\+xml;utf8,/, ''))}
            width="100%"
            height="100%"
          />
        ) : (
          <SvgUri uri={previewUri || ''} width="100%" height="100%" />
        )}
        {loading && (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.gold} />
          </View>
        )}
      </View>

      {/* Toggle current / generated */}
      {!!initialAvatar && (
        <Pressable style={styles.toggleBtn} onPress={() => setUseGenerated((p) => !p)}>
          <Text style={styles.toggleText}>
            {useGenerated ? '← Use current avatar' : '✦ Use generated avatar'}
          </Text>
        </Pressable>
      )}

      {/* Controls — scrollable */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.controls}>
        <ChipRow
          label="Face"
          options={FACE_OPTIONS}
          selected={face}
          onSelect={(v) => { setUseGenerated(true); setFace(v); }}
        />
        <ChipRow
          label="Head / Hair"
          options={HEAD_OPTIONS}
          selected={head}
          onSelect={(v) => { setUseGenerated(true); setHead(v); }}
        />
        <OptionalChipRow
          label="Accessories"
          options={ACCESSORIES_VALUES}
          selected={accessories}
          onSelect={(v) => { setUseGenerated(true); setAccessories(v); }}
        />
        <OptionalChipRow
          label="Facial Hair"
          options={FACIAL_HAIR_VALUES}
          selected={facialHair}
          onSelect={(v) => { setUseGenerated(true); setFacialHair(v); }}
        />
        <SwatchRow
          label="Skin Colour"
          swatches={SKIN_COLOR_SWATCHES}
          selected={skinColor}
          onSelect={(v) => { setUseGenerated(true); setSkinColor(v); }}
        />
        <SwatchRow
          label="Clothing Colour"
          swatches={CLOTHING_COLOR_SWATCHES}
          selected={clothingColor}
          onSelect={(v) => { setUseGenerated(true); setClothingColor(v); }}
        />

        <Pressable style={styles.randomBtn} onPress={randomizeAll}>
          <Text style={styles.randomBtnText}>🎲  Randomize All</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Preview circle
  preview: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.borderGoldBright,
    backgroundColor: colors.bgInput,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Toggle button
  toggleBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  toggleText: {
    color: colors.goldLight,
    fontSize: 12,
    fontFamily: fonts.body,
  },

  // Controls
  controls: {
    flex: 1,
  },

  // Field block
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    color: colors.gold,
    fontFamily: fonts.heading,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Dice randomize button
  diceBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgPanelLight,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceBtnText: {
    fontSize: 14,
  },

  // Chip scroll row
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
    flexWrap: 'nowrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.bgInput,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },
  chipText: {
    color: colors.creamMuted,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  chipTextActive: {
    color: colors.gold,
  },

  // Swatch row
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },

  // Randomize all button
  randomBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  randomBtnText: {
    ...buttonStyles.secondaryText,
    fontFamily: fonts.heading,
  },
});
