import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

// Phase 1 timing (Narsinh Creations) — must total PHASE1_MS
const PHASE1_MS  = 1000;
const FADE_IN_MS  = 250;
const FADE_OUT_MS = 250;
const HOLD_MS     = PHASE1_MS - FADE_IN_MS - FADE_OUT_MS; // 500 ms

// System serif — Cinzel may not be loaded yet during the loading screen
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export default function AppLoadingScreen({ isReady }) {
  const [phase, setPhase]   = useState(1);   // 1 = studio, 2 = app title
  const [mounted, setMounted] = useState(true);

  const phase1Opacity = useRef(new Animated.Value(0)).current;
  const phase2Opacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Loading-dot pulse values
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  // ── Phase 1: fade in → hold → fade out → begin phase 2 ──────────────────
  useEffect(() => {
    Animated.sequence([
      Animated.timing(phase1Opacity, { toValue: 1, duration: FADE_IN_MS,  useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(phase1Opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
    ]).start(() => {
      setPhase(2);
      Animated.timing(phase2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: staggered dot pulse loop ────────────────────────────────────
  useEffect(() => {
    if (phase !== 2) return;

    const makePulse = (dot, delayMs) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(dot, { toValue: 1,    duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 380, useNativeDriver: true }),
        ])
      );

    const a1 = makePulse(dot1, 0);
    const a2 = makePulse(dot2, 190);
    const a3 = makePulse(dot3, 380);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fade entire screen out once app is ready (phase 2 only) ──────────────
  useEffect(() => {
    if (!isReady || phase !== 2) return;
    Animated.timing(screenOpacity, { toValue: 0, duration: 450, useNativeDriver: true })
      .start(() => setMounted(false));
  }, [isReady, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>

      {/* ── Phase 1 — Narsinh Creations ─────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.phase1Container, { opacity: phase1Opacity }]}
      >
        <Text style={styles.studioEyebrow}>A</Text>
        <Text style={styles.studioName}>Narsinh Creations</Text>
        <Text style={styles.studioTagline}>PRODUCTION</Text>
      </Animated.View>

      {/* ── Phase 2 — 52 Patta ──────────────────────────────────────────── */}
      {phase === 2 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.phase2Container, { opacity: phase2Opacity }]}
        >
          <Text style={styles.appTitle}>52 Patta</Text>
          <Text style={styles.appSuits}>♠  ♥  ♦  ♣</Text>

          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { opacity: dot1 }]} />
            <Animated.View style={[styles.dot, { opacity: dot2 }]} />
            <Animated.View style={[styles.dot, { opacity: dot3 }]} />
          </View>
        </Animated.View>
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },

  // Phase 1 — clean black studio card
  phase1Container: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  studioEyebrow: {
    fontFamily: SERIF,
    fontSize: 13,
    color: '#666666',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
  studioName: {
    fontFamily: SERIF,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  studioTagline: {
    fontFamily: SERIF,
    fontSize: 11,
    color: '#666666',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },

  // Phase 2 — app branding on felt green
  phase2Container: {
    backgroundColor: '#080f0a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  appTitle: {
    fontFamily: SERIF,
    fontSize: 56,
    color: '#c9a227',
    letterSpacing: 6,
    textAlign: 'center',
  },
  appSuits: {
    fontSize: 20,
    color: 'rgba(201, 162, 39, 0.45)',
    letterSpacing: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 40,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#c9a227',
  },
});
