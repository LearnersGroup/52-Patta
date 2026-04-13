import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { WsNextRound } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, spacing } from '../../../styles/theme';

const TEAM_A_COLOR = '#38bdf8';
const TEAM_B_COLOR = '#f472b6';

const RESULT_LABELS = {
  'win-by-tricks':     'Won by Tricks',
  'win-by-mendi':      'Won by Tens (Mendi)',
  mendikot:            'Mendikot! (All 4 Tens)',
  '52-card mendikot':  '52-Card Mendikot! (All Tricks)',
};

const TOTAL_KEYS = [
  'win-by-tricks',
  'win-by-mendi',
  'mendikot',
  '52-card mendikot',
];

/**
 * End-of-round and end-of-series scoreboard for Mendikot.
 */
const MendikotScoreBoard = memo(({ phase, nextRoundReady }) => {
  const scoringResult    = useSelector((s) => s.game.scoringResult);
  const tricksByTeam     = useSelector((s) => s.game.tricks_by_team) || { A: 0, B: 0 };
  const tensByTeam       = useSelector((s) => s.game.tens_by_team) || { A: 0, B: 0 };
  const sessionTotals    = useSelector((s) => s.game.session_totals) || { A: {}, B: {} };
  const roundResults     = useSelector((s) => s.game.round_results) || [];
  const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
  const totalRounds      = useSelector((s) => s.game.totalRounds) || 1;

  const isSeries  = phase === 'series-finished';
  const readyCount = nextRoundReady?.readyPlayers?.length || 0;
  const totalCount = nextRoundReady?.totalPlayers || 0;
  const winnerTeam = scoringResult?.winningTeam; // 'A' | 'B'

  const bannerBg    = winnerTeam === 'A' ? 'rgba(56,189,248,0.15)' : 'rgba(244,114,182,0.15)';
  const bannerBorder = winnerTeam === 'A' ? 'rgba(56,189,248,0.4)' : 'rgba(244,114,182,0.4)';

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Result banner ── */}
      {scoringResult ? (
        <View style={[styles.banner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
          <Text style={styles.bannerWinner}>Team {scoringResult.winningTeam} Wins!</Text>
          <Text style={styles.bannerType}>
            {RESULT_LABELS[scoringResult.type] || scoringResult.type}
          </Text>
        </View>
      ) : null}

      {/* ── Round summary ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Round {currentRoundNumber} of {totalRounds}</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.teamLabel, { color: TEAM_A_COLOR }]}>Team A:</Text>
          <Text style={styles.summaryValue}>
            {tricksByTeam.A} tricks, {tensByTeam.A} ten{tensByTeam.A !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.teamLabel, { color: TEAM_B_COLOR }]}>Team B:</Text>
          <Text style={styles.summaryValue}>
            {tricksByTeam.B} tricks, {tensByTeam.B} ten{tensByTeam.B !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* ── Session totals table ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Totals</Text>
        <View style={styles.table}>
          {/* header */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellLeft, styles.tableHeader]} />
            <Text style={[styles.tableCell, styles.tableHeader, { color: TEAM_A_COLOR }]}>A</Text>
            <Text style={[styles.tableCell, styles.tableHeader, { color: TEAM_B_COLOR }]}>B</Text>
          </View>
          {TOTAL_KEYS.map((key) => (
            <View key={key} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLeft, styles.tableRowLabel]} numberOfLines={1}>
                {RESULT_LABELS[key]}
              </Text>
              <Text style={[styles.tableCell, { color: TEAM_A_COLOR }]}>
                {sessionTotals.A?.[key] || 0}
              </Text>
              <Text style={[styles.tableCell, { color: TEAM_B_COLOR }]}>
                {sessionTotals.B?.[key] || 0}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Round history ── */}
      {roundResults.length > 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Round History</Text>
          {roundResults.map((r) => {
            const teamColor = r.winningTeam === 'A' ? TEAM_A_COLOR : TEAM_B_COLOR;
            return (
              <View key={r.roundNumber} style={styles.historyRow}>
                <Text style={styles.historyNum}>R{r.roundNumber}</Text>
                <Text style={[styles.historyWinner, { color: teamColor }]}>
                  Team {r.winningTeam}
                </Text>
                <Text style={styles.historyType} numberOfLines={1}>
                  {RESULT_LABELS[r.type] || r.type}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Next round / Series done ── */}
      {isSeries ? (
        <Text style={styles.seriesDone}>Series complete! 🎉</Text>
      ) : (
        <View style={styles.nextRound}>
          <Pressable
            style={[buttonStyles.base, buttonStyles.primary]}
            onPress={() => WsNextRound()}
          >
            <Text style={buttonStyles.primaryText}>Next Round</Text>
          </Pressable>
          {totalCount > 0 ? (
            <Text style={styles.readyCount}>{readyCount} / {totalCount} ready</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
});

MendikotScoreBoard.displayName = 'MendikotScoreBoard';
export default MendikotScoreBoard;

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Banner ────────────────────────────────────────────────────────────────
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  bannerWinner: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.cream,
    fontWeight: '700',
  },
  bannerType: {
    fontSize: 13,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  // ── Summary ───────────────────────────────────────────────────────────────
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  teamLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 56,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.cream,
    fontFamily: fonts.body,
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    gap: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
  },
  tableCell: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    color: colors.cream,
    fontFamily: fonts.body,
  },
  tableCellLeft: {
    flex: 1,
    textAlign: 'left',
    paddingRight: spacing.sm,
  },
  tableHeader: {
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    fontSize: 11,
    color: colors.creamMuted,
  },
  tableRowLabel: {
    color: colors.creamMuted,
    fontSize: 11,
  },

  // ── History ───────────────────────────────────────────────────────────────
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  historyNum: {
    fontSize: 11,
    color: colors.creamMuted,
    minWidth: 24,
    fontFamily: fonts.body,
  },
  historyWinner: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    minWidth: 50,
  },
  historyType: {
    fontSize: 11,
    color: colors.creamMuted,
    fontFamily: fonts.body,
    flex: 1,
  },

  // ── Next round / series done ───────────────────────────────────────────────
  nextRound: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  readyCount: {
    fontSize: 12,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  seriesDone: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
