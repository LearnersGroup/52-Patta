import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, pillStyle, spacing, typography } from '../../../styles/theme';
import PartnerCardDisplay from './PartnerCardDisplay';

export default function TeamScoreHUD({
  trumpText,
  roundText,
  onShowScoreboard,
  onShowSettings,
  isAdmin = false,
  onQuit,
  // Kaliteri team score props
  gameType,
  phase,
  tricks = [],
  teams = {},
  leader,
  partnerCards = [],
  getName,
}) {
  const isKaliteriPlaying = gameType === 'kaliteri' && (phase === 'playing' || phase === 'powerhouse');

  // Compute per-player trick points
  const playerTrickPoints = useMemo(() => {
    const pts = {};
    (tricks || []).forEach((t) => {
      if (t.winner) {
        pts[t.winner] = (pts[t.winner] || 0) + (t.points || 0);
      }
    });
    return pts;
  }, [tricks]);

  const allRevealed = partnerCards.length > 0 && partnerCards.every((pc) => pc.revealed);

  const bidScore = allRevealed
    ? (teams.bid || []).reduce((sum, pid) => sum + (playerTrickPoints[pid] || 0), 0)
    : playerTrickPoints[leader] || 0;

  const opposeScore = allRevealed
    ? (teams.oppose || []).reduce((sum, pid) => sum + (playerTrickPoints[pid] || 0), 0)
    : null;

  const showPartnerCards = isKaliteriPlaying && partnerCards.length > 0;

  return (
    <View style={styles.outerRow}>
      {/* ── Left column: control row + optional team score row ── */}
      <View style={styles.leftCol}>
        {/* Row 1: Quit, Trump, Round, Scoreboard */}
        <View style={styles.row}>
          {isAdmin && onQuit ? (
            <Pressable style={styles.quitBtn} onPress={onQuit}>
              <Text style={styles.quitText}>✕ Quit</Text>
            </Pressable>
          ) : null}

          {trumpText ? (
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{trumpText}</Text>
            </View>
          ) : null}

          {roundText ? (
            <View style={styles.pill}>
              <Text style={styles.pillValue}>{roundText}</Text>
            </View>
          ) : null}

          <Pressable style={styles.scoreboardBtn} onPress={onShowScoreboard}>
            <Text style={styles.scoreboardText}>⊞</Text>
          </Pressable>

          <Pressable style={styles.scoreboardBtn} onPress={onShowSettings}>
            <Text style={styles.scoreboardText}>⚙</Text>
          </Pressable>
        </View>

        {/* Row 2: Team scores (kaliteri only during play) */}
        {isKaliteriPlaying ? (
          <View style={styles.scoreRow}>
            <View style={styles.teamScore}>
              <View style={[styles.teamDot, styles.bidDot]} />
              <Text style={styles.scoreText}>{bidScore}</Text>
            </View>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.teamScore}>
              <View style={[styles.teamDot, styles.opposeDot]} />
              <Text style={styles.scoreText}>
                {opposeScore !== null ? opposeScore : '???'}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* ── Right column: partner cards spanning both rows ── */}
      {showPartnerCards ? (
        <View style={styles.rightCol}>
          <PartnerCardDisplay partnerCards={partnerCards} getName={getName} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  leftCol: {
    flex: 1,
    gap: 2,
  },
  rightCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: spacing.xs,
  },
  pill: {
    ...pillStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillValue: {
    ...typography.captionSmall,
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  scoreboardBtn: {
    ...pillStyle,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreboardText: {
    fontSize: 16,
    color: colors.goldLight,
    lineHeight: 20,
  },
  quitBtn: {
    ...pillStyle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderColor: 'rgba(204, 41, 54, 0.5)',
    backgroundColor: 'rgba(204, 41, 54, 0.08)',
  },
  quitText: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.redSuit,
  },

  /* ── Team score row ── */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 2,
  },
  teamScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bidDot: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  opposeDot: {
    backgroundColor: colors.redSuit,
    shadowColor: colors.redSuit,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    fontWeight: '700',
    color: colors.cream,
  },
  vsText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.creamMuted,
    fontStyle: 'italic',
  },
});
