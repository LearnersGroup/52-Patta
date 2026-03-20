import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buttonStyles, colors, fonts, panelStyle, pillStyle, spacing, typography } from '../../../styles/theme';

const SCOREBOARD_SECONDS = 5;

export default function KaliteriScoreBoard({
  scores = {},
  teams = {},
  tricks = [],
  scoringResult,
  seatOrder = [],
  getName,
  nextRoundReady = { readyPlayers: [], totalPlayers: 0 },
  userId,
  currentGameNumber = 1,
  totalGames = 1,
  onNextRound,
}) {
  const [countdown, setCountdown] = useState(SCOREBOARD_SECONDS);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setCountdown(SCOREBOARD_SECONDS);
    setDismissed(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setDismissed(true);
    }
  }, [countdown]);

  const bidTeamPoints = useMemo(
    () =>
      (tricks || []).reduce((sum, t) => {
        if (teams?.bid?.includes(t?.winner)) return sum + (t?.points || 0);
        return sum;
      }, 0),
    [tricks, teams]
  );

  const opposeTeamPoints = useMemo(
    () =>
      (tricks || []).reduce((sum, t) => {
        if (teams?.oppose?.includes(t?.winner)) return sum + (t?.points || 0);
        return sum;
      }, 0),
    [tricks, teams]
  );

  const readyPlayers = nextRoundReady?.readyPlayers || [];
  const totalPlayers = nextRoundReady?.totalPlayers || seatOrder.length || 0;
  const isReady = !!userId && readyPlayers.includes(userId);
  const waitingPlayers = (seatOrder || []).filter((pid) => !readyPlayers.includes(pid));

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Game Over</Text>
        <Text style={styles.subtitle}>Game {currentGameNumber} of {totalGames}</Text>
      </View>

      {!dismissed ? (
        <>
          <View style={styles.teamRow}>
            <View style={styles.teamCard}>
              <Text style={styles.teamLabel}>Bid Team</Text>
              <Text style={styles.teamPoints}>{bidTeamPoints}</Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.teamCard}>
              <Text style={styles.teamLabel}>Oppose Team</Text>
              <Text style={styles.teamPoints}>{opposeTeamPoints}</Text>
            </View>
          </View>

          {scoringResult ? (
            <View style={[styles.resultBox, scoringResult?.bidTeamSuccess ? styles.hitRow : styles.missRow]}>
              <Text style={[styles.resultStatus, scoringResult?.bidTeamSuccess ? styles.success : styles.fail]}>
                {scoringResult?.bidTeamSuccess ? 'Bid Team Wins' : 'Bid Team Failed'}
              </Text>
              <Text style={styles.resultSub}>
                Bid {scoringResult?.bidAmount} • Scored {scoringResult?.bidTeamPoints}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Player Deltas</Text>
          <ScrollView style={styles.list}>
            {Object.entries(scoringResult?.playerDeltas || {}).map(([pid, delta]) => (
              <View key={pid} style={[styles.row, delta >= 0 ? styles.hitRow : styles.missRow]}>
                <Text style={styles.name}>{getName(pid)}</Text>
                <Text style={[styles.delta, delta < 0 ? styles.fail : styles.success]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
                <Text style={styles.total}>Total {scores?.[pid] || 0}</Text>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.dismissBtn} onPress={() => setDismissed(true)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.smallNote}>Scoreboard hidden</Text>
      )}

      <View style={styles.readyBox}>
        <Text style={styles.readyLabel}>Ready: {readyPlayers.length}/{totalPlayers}</Text>
        {waitingPlayers.length ? (
          <Text style={styles.waitingText} numberOfLines={2}>
            Waiting: {waitingPlayers.map((pid) => getName(pid)).join(', ')}
          </Text>
        ) : null}

        <View style={styles.countdownPill}>
          <Text style={styles.countdownText}>Auto-advancing in {countdown}s...</Text>
        </View>

        <Pressable style={[styles.readyBtn, isReady && styles.readyBtnDone]} onPress={onNextRound} disabled={isReady}>
          <Text style={styles.readyBtnText}>{isReady ? 'Ready ✓' : 'Ready for Next Game'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.cream,
    fontSize: 18,
  },
  subtitle: {
    ...typography.label,
    color: colors.goldLight,
    fontSize: 11,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamCard: {
    flex: 1,
    ...panelStyle,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
  },
  teamLabel: {
    ...typography.label,
    color: colors.creamMuted,
    fontSize: 10,
  },
  teamPoints: {
    fontFamily: fonts.heading,
    color: colors.goldLight,
    fontSize: 22,
  },
  vs: {
    fontFamily: fonts.heading,
    color: colors.creamMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  resultBox: {
    ...panelStyle,
    borderRadius: 10,
    padding: spacing.sm,
    gap: 4,
  },
  resultStatus: {
    fontFamily: fonts.heading,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  success: {
    color: '#2ecc71',
  },
  fail: {
    color: '#cc2936',
  },
  hitRow: {
    backgroundColor: 'rgba(46, 204, 113, 0.06)',
  },
  missRow: {
    backgroundColor: 'rgba(204, 41, 54, 0.06)',
  },
  resultSub: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.cream,
    fontSize: 11,
  },
  list: {
    maxHeight: 210,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
  },
  name: {
    fontFamily: fonts.body,
    color: colors.cream,
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
  },
  delta: {
    fontFamily: fonts.heading,
    width: 52,
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 13,
  },
  total: {
    fontFamily: fonts.body,
    width: 84,
    textAlign: 'right',
    color: colors.creamMuted,
    fontSize: 12,
  },
  dismissBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.small,
    alignSelf: 'flex-start',
  },
  dismissText: {
    ...buttonStyles.secondaryText,
    ...buttonStyles.smallText,
  },
  smallNote: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
  },
  readyBox: {
    ...panelStyle,
    borderRadius: 10,
    padding: spacing.sm,
    gap: 6,
  },
  readyLabel: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  waitingText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
  },
  countdownPill: {
    ...pillStyle,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: '700',
  },
  readyBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    width: '100%',
  },
  readyBtnDone: {
    opacity: 0.65,
  },
  readyBtnText: {
    ...buttonStyles.primaryText,
  },
});
