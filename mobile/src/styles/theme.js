// ---------------------------------------------------------------------------
// Patta Mobile – Shared Design Tokens & Style Objects
// Mirrors the web client's SCSS design system for React Native
// ---------------------------------------------------------------------------

// --- Fonts ----------------------------------------------------------------

export const fonts = {
  heading: 'Cinzel_700Bold',
  headingMedium: 'Cinzel_600SemiBold',
  headingRegular: 'Cinzel_400Regular',
  body: 'Lato_400Regular',
  bodyBold: 'Lato_700Bold',
};

// --- Colors ---------------------------------------------------------------

export const colors = {
  // Core palette (preserved from original)
  bgDeep: '#080f0a',
  bgFelt: '#0f2314',
  bgPanel: '#132a19',
  bgPanelLight: '#1a3a22',
  bgInput: '#0d1e11',
  gold: '#c9a227',
  goldLight: '#e8d16a',
  goldDark: '#8a6e18',
  redSuit: '#cc2936',
  cream: '#f5f0e8',
  creamMuted: '#a89f8e',
  greenGlow: 'rgba(30, 77, 42, 0.3)',
  borderGold: 'rgba(201, 162, 39, 0.28)',
  borderGoldBright: 'rgba(201, 162, 39, 0.65)',
  glowGold: 'rgba(201, 162, 39, 0.15)',
  shadow: 'rgba(0, 0, 0, 0.55)',

  // Semantic – status colors
  ready: '#f472b6',
  readyLight: '#38bdf8',
  readyBg: 'rgba(244, 114, 182, 0.12)',
  readyBorder: 'rgba(244, 114, 182, 0.35)',
  dangerBg: 'rgba(204, 41, 54, 0.08)',
  dangerBorder: 'rgba(204, 41, 54, 0.35)',
  warningBg: 'rgba(243, 156, 18, 0.1)',
  warningBorder: 'rgba(243, 156, 18, 0.45)',
  infoBg: 'rgba(52, 152, 219, 0.1)',
  infoBorder: 'rgba(52, 152, 219, 0.45)',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.82)',
  buttonText: '#1a0f00',
};

// --- Spacing --------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// --- Typography -----------------------------------------------------------

export const typography = {
  heading: { fontSize: 26, fontWeight: '700', fontFamily: 'Cinzel_700Bold' },
  title: { fontSize: 20, fontWeight: '700', fontFamily: 'Cinzel_700Bold', letterSpacing: 1.5 },
  subtitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Cinzel_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  body: { fontSize: 16, fontWeight: '400' },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  captionSmall: { fontSize: 11, fontWeight: '400' },
  mono: { fontFamily: 'monospace', letterSpacing: 3 },
};

// --- Reusable Style Objects -----------------------------------------------
// Plain objects intended for spreading (not StyleSheet.create).

// Panel – the standard card/container treatment
export const panelStyle = {
  backgroundColor: '#132a19',
  borderWidth: 1,
  borderColor: 'rgba(201, 162, 39, 0.28)',
  borderRadius: 14,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.55,
  shadowRadius: 16,
  elevation: 8,
};

// Form inputs
export const inputStyle = {
  backgroundColor: '#0d1e11',
  borderWidth: 1,
  borderColor: 'rgba(201, 162, 39, 0.28)',
  borderRadius: 7,
  color: '#f5f0e8',
  fontSize: 16,
  paddingVertical: 12,
  paddingHorizontal: 16,
};

export const inputFocusStyle = {
  borderColor: '#c9a227',
  shadowColor: 'rgba(201, 162, 39, 0.15)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 6,
};

// --- Button Styles --------------------------------------------------------

export const buttonStyles = {
  // Shared base
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 7,
    flexDirection: 'row',
  },

  // Variants – container
  primary: {
    backgroundColor: '#c9a227',
    shadowColor: 'rgba(201, 162, 39, 0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 4,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.28)',
  },
  danger: {
    backgroundColor: '#cc2936',
    shadowColor: 'rgba(204, 41, 54, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 4,
  },
  ready: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.35)',
  },
  readyActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.25)',
    borderColor: '#2ecc71',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(245, 240, 232, 0.2)',
  },

  // Variants – text
  primaryText: {
    color: '#1a0f00',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Cinzel_700Bold',
  },
  secondaryText: {
    color: '#c9a227',
    fontFamily: 'Cinzel_700Bold',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dangerText: {
    color: '#f5f0e8',
    fontFamily: 'Cinzel_700Bold',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  readyText: {
    color: '#2ecc71',
    fontFamily: 'Cinzel_700Bold',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  outlineText: {
    color: '#a89f8e',
    fontFamily: 'Cinzel_700Bold',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Modifiers
  disabled: {
    opacity: 0.45,
  },
  small: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  smallText: {
    fontSize: 11,
  },
  full: {
    width: '100%',
  },
};

// --- Shadow Presets -------------------------------------------------------

export const shadows = {
  shallow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  deep: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: 'rgba(201, 162, 39, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
};

// --- Card Design Tokens ---------------------------------------------------

export const cardTokens = {
  // Aspect ratio 5:7
  ratio: 7 / 5,

  // Preset sizes  { width, height }
  sizes: {
    hand: { width: 56, height: 78 },
    play: { width: 60, height: 84 },
    partner: { width: 40, height: 56 },
  },

  // Face
  faceBg: '#ffffff',
  faceBorder: '#d9d9d9',
  redSuit: '#cc2936',
  blackSuit: '#1a1a1a',
  borderRadius: 5,

  // Shadow (face)
  faceShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },

  // Back
  backBgOuter: '#1a2a3a',
  backBgInner: '#0f1a24',
  backBorder: 'rgba(201, 162, 39, 0.25)',
  backAccent: '#c9a227',
  backShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },

  // Hand interaction
  playableBorder: 'rgba(46, 204, 113, 0.4)',
  playableActiveBorder: '#2ecc71',
  playableGlow: {
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledOpacity: 0.55,
};

// --- Badge / Pill ---------------------------------------------------------

export const pillStyle = {
  paddingVertical: 4,
  paddingHorizontal: 10,
  borderRadius: 12,
  backgroundColor: 'rgba(19, 42, 25, 0.92)',
  borderWidth: 1,
  borderColor: 'rgba(201, 162, 39, 0.28)',
};

// --- Felt Table -----------------------------------------------------------

export const feltStyle = {
  backgroundColor: '#0f2314',
  borderWidth: 2,
  borderColor: 'rgba(201, 162, 39, 0.28)',
  borderRadius: 999, // full circle
};

// --- Modal Overlay --------------------------------------------------------

export const modalOverlayStyle = {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.82)',
  justifyContent: 'center',
  alignItems: 'center',
};

// --- Divider --------------------------------------------------------------

export const dividerStyle = {
  height: 1,
  backgroundColor: 'rgba(201, 162, 39, 0.15)',
  marginVertical: 12,
};
