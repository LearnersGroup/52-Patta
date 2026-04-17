import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AppBackground from './AppBackground';

const logo = require('../../../assets/Icons/52_Patta_Icon_Suits.png');
const ncLogoScreen = require('../../../assets/NC_LOGO_SCREEN.jpeg');

// Phase 1 timing (Narsinh Creations)
const PHASE1_MS   = 1500;
const FADE_OUT_MS = 250;
const HOLD_MS     = PHASE1_MS - FADE_OUT_MS;

// Minimum time phase 2 (52 Patta) must stay visible
const PHASE2_MIN_MS = 1500;

// Progress bar
const PROGRESS_DURATION  = 1000; // 0 → 100% in 1 s
const BAR_HEIGHT         = 12;
const PROGRESS_TEXT_SIZE = 21;
const PROGRESS_TEXT_LINE = 38; // explicit lineHeight for predictable translateY calc

// System serif — Cinzel may not be loaded yet during the loading screen
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export default function AppLoadingScreen({ isReady }) {
  const { width } = useWindowDimensions();

  const [phase, setPhase]           = useState(1);
  const [phase2Done, setPhase2Done] = useState(false);
  const [mounted, setMounted]       = useState(true);

  const phase1Opacity = useRef(new Animated.Value(1)).current;
  const phase2Opacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const glowAnim      = useRef(new Animated.Value(0)).current;

  // ── Phase 1 out / Phase 2 in ──────────────────────────────────────────────
  useEffect(() => {
    const holdTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(phase1Opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
        Animated.timing(phase2Opacity, { toValue: 1, duration: FADE_OUT_MS, useNativeDriver: true }),
      ]).start(() => {
        setPhase(2);
        setTimeout(() => setPhase2Done(true), PHASE2_MIN_MS);
      });
    }, HOLD_MS);
    return () => clearTimeout(holdTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: progress bar fill + single glow blink ───────────────────────
  useEffect(() => {
    if (phase !== 2) return;
    Animated.timing(progressWidth, {
      toValue: width,
      duration: PROGRESS_DURATION,
      useNativeDriver: false,
    }).start();
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, [phase, width]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fade entire screen out once app is ready AND min hold has elapsed ─────
  useEffect(() => {
    if (!isReady || !phase2Done || phase !== 2) return;
    Animated.timing(screenOpacity, { toValue: 0, duration: 450, useNativeDriver: true })
      .start(() => setMounted(false));
  }, [isReady, phase2Done, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const animatedGlowStyle = {
    shadowColor: '#c9a227',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
    shadowRadius: 24,
  };

  // Integer percentage label driven by the progress animation
  const progressLabel = progressWidth.interpolate({
    inputRange: Array.from({ length: 101 }, (_, i) => (i / 100) * width),
    outputRange: Array.from({ length: 101 }, (_, i) => `${i}%`),
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>

      {/* ── Phase 1 — Narsinh Creations ─────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.phase1Container, { opacity: phase1Opacity }]}
      >
        <Image source={ncLogoScreen} style={styles.ncScreen} resizeMode="cover" />
      </Animated.View>

      {/* ── Phase 2 — 52 Patta (always mounted, opacity starts at 0) ───── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: phase2Opacity }]}
      >
        <AppBackground center>
          <View style={styles.brandingCenter}>
            <Animated.View style={[styles.logoWrapper, animatedGlowStyle]}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </Animated.View>
            <Text style={styles.appTitle}>52 Patta</Text>
          </View>
        </AppBackground>

        {/* Progress bar — hugs bottom edge, end to end */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { width }]}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          {/* Percentage label — rendered after track so it sits on top */}
          <Animated.Text style={styles.progressLabel}>{progressLabel}</Animated.Text>
        </View>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: '#000000',
  },

  phase1Container: {
    backgroundColor: '#000000',
    flex: 1,
  },
  ncScreen: {
    flex: 1,
    width: '100%',
  },

  brandingCenter: {
    alignItems: 'center',
    gap: 12,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    backgroundColor: 'transparent',
  },
  appTitle: {
    fontFamily: SERIF,
    fontSize: 48,
    color: '#c9a227',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 8,
  },

  // Progress — bottom edge, end to end
  progressContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
  },
  progressLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BAR_HEIGHT - PROGRESS_TEXT_LINE * 0.3,
    color: '#fff',
    fontSize: PROGRESS_TEXT_SIZE,
    lineHeight: PROGRESS_TEXT_LINE,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  progressTrack: {
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(201, 162, 39, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c9a227',
  },
});
