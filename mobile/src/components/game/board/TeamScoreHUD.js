import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, panelStyle, pillStyle, shadows, spacing, typography } from '../../../styles/theme';

export default function TeamScoreHUD({
  gameType = 'kaliteri',
  phase,
  teams,
  tricks,
  leader,
  scores,
  roundText,
  trumpText,
  onShowScoreboard,
}) {
  const trickPoints = {};
  (tricks || []).forEach((t) => {
    if (!t?.winner) return;
    trickPoints[t.winner] = (trickPoints[t.winner] || 0) + (t.points || 0);
  });

  const bidTeam = teams?.bid || [];
  const opposeTeam = teams?.oppose || [];
  const bidScoreLive = bidTeam.reduce((sum, pid) => sum + (trickPoints[pid] || 0), 0);
  const opposeScoreLive = opposeTeam.reduce((sum, pid) => sum + (trickPoints[pid] || 0), 0);
  const bidScoreTotal = bidTeam.reduce((sum, pid) => sum + (scores?.[pid] || 0), 0);
  const opposeScoreTotal = opposeTeam.reduce((sum, pid) => sum + (scores?.[pid] || 0), 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>PHASE</Text>
          <Text style={styles.pillValue}>{phase || 'lobby'}</Text>
        </View>
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
      </View>

      {gameType === 'kaliteri' ? (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>TEAM SCORE</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Bid</Text>
            <Text style={styles.scoreNumber}>{bidScoreLive}</Text>
            <Text style={styles.scoreSep}>trick pts</Text>
            <Text style={styles.scoreSep}>{'\u2022'}</Text>
            <Text style={styles.scoreLabel}>Total</Text>
            <Text style={styles.scoreNumberGold}>{bidScoreTotal}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Oppose</Text>
            <Text style={styles.scoreNumber}>{opposeScoreLive}</Text>
            <Text style={styles.scoreSep}>trick pts</Text>
            <Text style={styles.scoreSep}>{'\u2022'}</Text>
            <Text style={styles.scoreLabel}>Total</Text>
            <Text style={styles.scoreNumberGold}>{opposeScoreTotal}</Text>
          </View>
          {leader ? <Text style={styles.helper}>Leader: {leader.slice(0, 8)}...</Text> : null}
        </View>
      ) : (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>ROUND SUMMARY</Text>
          <Text style={styles.scoreLine}>Players: {(Object.keys(scores || {}).length || 0)}</Text>
          <Text style={styles.scoreLine}>Current trick points tracked: {Object.keys(trickPoints).length}</Text>
        </View>
      )}

      <Pressable style={styles.scoreboardBtn} onPress={onShowScoreboard}>
        <Text style={styles.scoreboardText}>VIEW SCOREBOARD</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    ...pillStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillLabel: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pillValue: {
    ...typography.captionSmall,
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  scoreCard: {
    ...panelStyle,
    padding: spacing.sm,
    gap: 4,
  },
  scoreTitle: {
    ...typography.label,
    color: colors.cream,
    fontFamily: fonts.heading,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scoreNumber: {
    color: colors.cream,
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  scoreNumberGold: {
    color: colors.gold,
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  scoreSep: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  scoreLine: {
    ...typography.caption,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  helper: {
    ...typography.captionSmall,
    color: colors.goldLight,
    fontFamily: fonts.body,
    fontStyle: 'italic',
  },
  scoreboardBtn: {
    ...pillStyle,
    alignSelf: 'flex-start',
    ...shadows.shallow,
  },
  scoreboardText: {
    ...typography.captionSmall,
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
