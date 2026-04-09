import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AppBackground from './AppBackground';

const logo = require('../../../assets/logo.png');
const ncLogoScreen = require('../../../assets/NC_LOGO_SCREEN.png');

// Phase 1 timing (Narsinh Creations)
const PHASE1_MS   = 1500;
const FADE_OUT_MS = 250;
const HOLD_MS     = PHASE1_MS - FADE_OUT_MS; // 1250 ms hold before crossfade

// Minimum time phase 2 (52 Patta) must stay visible
const PHASE2_MIN_MS = 1500;

// Progress bar
const BAR_H_PADDING = 40; // horizontal padding on each side
const PROGRESS_DURATION = 1000; // 0 → 100% in 1 s

// System serif — Cinzel may not be loaded yet during the loading screen
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export default function AppLoadingScreen({ isReady }) {
  const { width } = useWindowDimensions();
  const trackWidth = width - BAR_H_PADDING * 2;

  const [phase, setPhase]           = useState(1);   // 1 = studio, 2 = app title
  const [phase2Done, setPhase2Done] = useState(false);
  const [mounted, setMounted]       = useState(true);

  const phase1Opacity = useRef(new Animated.Value(1)).current;
  const phase2Opacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // ── Phase 1 out / Phase 2 in — crossfade so there is never a gap ─────────
  // Phase 1 starts at opacity 1 (immediately visible when native splash hides).
  // A plain setTimeout avoids mixing Animated.delay (JS-thread) with native-driver
  // animations inside Animated.sequence, which can cause the sequence to stall.
  useEffect(() => {
    const holdTimer = setTimeout(() => {
      // Both animate simultaneously: no moment where neither has a background
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

  // ── Phase 2: fill progress bar 0 → 100% over 1 s ─────────────────────────
  useEffect(() => {
    if (phase !== 2) return;
    Animated.timing(progressWidth, {
      toValue: trackWidth,
      duration: PROGRESS_DURATION,
      useNativeDriver: false, // width cannot use native driver
    }).start();
  }, [phase, trackWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fade entire screen out once app is ready AND min hold has elapsed ─────
  useEffect(() => {
    if (!isReady || !phase2Done || phase !== 2) return;
    Animated.timing(screenOpacity, { toValue: 0, duration: 450, useNativeDriver: true })
      .start(() => setMounted(false));
  }, [isReady, phase2Done, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

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
            <View style={styles.logoWrapper}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.appTitle}>52 Patta</Text>
          </View>
        </AppBackground>

        {/* Progress bar pinned to bottom, outside AppBackground so it stays absolute */}
        <View style={[styles.progressContainer, { paddingHorizontal: BAR_H_PADDING }]}>
          <View style={[styles.progressTrack, { width: trackWidth }]}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: '#000000', // safety net — never shows through
  },

  // Phase 1 — Narsinh Creations full-screen image
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
    shadowColor: '#c9a227',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
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

  // Progress bar — pinned to bottom
  progressContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(201, 162, 39, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c9a227',
    borderRadius: 3,
  },
});
