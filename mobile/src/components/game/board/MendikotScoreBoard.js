import { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { WsNextRound } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, spacing } from '../../../styles/theme';
import CardFace from '../CardFace';
import { cardKey } from '../utils/cardMapper';

const TEAM_A_COLOR = '#38bdf8';
const TEAM_B_COLOR = '#f472b6';

const RESULT_LABELS = {
  'win-by-tricks':     'Won by Tricks',
  'win-by-mendi':      'Won by Tens (Mendi)',
  mendikot:            'Mendikot! (All 4 Tens)',
  '52-card mendikot':  '52-Card Mendikot! (All Tricks)',
};

const RESULT_SHORT = {
  'win-by-tricks':     'Tricks',
  'win-by-mendi':      'Tens',
  mendikot:            'Mendikot!',
  '52-card mendikot':  '52 Patta!',
};

const TOTAL_KEYS = [
  'win-by-tricks',
  'win-by-mendi',
  'mendikot',
  '52-card mendikot',
];

const AUTO_ADVANCE_SECS = 10;

const HIST_CARD_W = 18;
const HIST_CARD_H = Math.round(HIST_CARD_W * 1.4);
const HIST_STACK_OFFSET = Math.round(HIST_CARD_W * 0.22);

// ── Team cell: tricks count + stacked tens cards ────────────────────────────

const TeamHistCell = memo(function TeamHistCell({ team, roundData }) {
  const tensCards = roundData.tens_cards_by_team?.[team] || [];
  const tricks = roundData.tricks_by_team?.[team] || 0;
  const color = team === 'A' ? TEAM_A_COLOR : TEAM_B_COLOR;
  const n = tensCards.length;
  const stackWidth = n > 0 ? HIST_CARD_W + (n - 1) * HIST_STACK_OFFSET : HIST_CARD_W;

  return (
    <View style={histStyles.teamCell}>
      {n > 0 ? (
        <View style={[histStyles.tensStack, { width: stackWidth, height: HIST_CARD_H }]}>
          {tensCards.map((card, i) => (
            <View key={cardKey(card) + i} style={[histStyles.tensCard, { left: i * HIST_STACK_OFFSET, zIndex: i + 1 }]}>
              <CardFace card={card} width={HIST_CARD_W} square />
            </View>
          ))}
        </View>
      ) : (
        <Text style={histStyles.noTens}>–</Text>
      )}
      <View style={[histStyles.tricksBadge, { backgroundColor: color }]}>
        <Text style={histStyles.tricksBadgeText}>{tricks}</Text>
      </View>
    </View>
  );
});

// ── Round history table ─────────────────────────────────────────────────────

const RoundHistoryTable = memo(function RoundHistoryTable({ roundResults }) {
  return (
    <View style={histStyles.table}>
      {/* Header */}
      <View style={histStyles.headerRow}>
        <Text style={[histStyles.th, histStyles.thNum]}>#</Text>
        <Text style={[histStyles.th, histStyles.thTeam, { color: TEAM_A_COLOR }]}>Team A</Text>
        <Text style={[histStyles.th, histStyles.thTeam, { color: TEAM_B_COLOR }]}>Team B</Text>
        <Text style={[histStyles.th, histStyles.thResult]}>Result</Text>
      </View>

      {roundResults.map((r) => {
        const winColor = r.winningTeam === 'A' ? TEAM_A_COLOR : TEAM_B_COLOR;
        const rowBg = r.winningTeam === 'A' ? 'rgba(56,189,248,0.08)' : 'rgba(244,114,182,0.08)';
        return (
          <View key={r.roundNumber} style={[histStyles.row, { backgroundColor: rowBg }]}>
            <Text style={histStyles.numCell}>{r.roundNumber}</Text>
            <View style={histStyles.teamCellWrap}>
              <TeamHistCell team="A" roundData={r} />
            </View>
            <View style={histStyles.teamCellWrap}>
              <TeamHistCell team="B" roundData={r} />
            </View>
            <View style={histStyles.resultCellWrap}>
              <Text style={[histStyles.resultWinner, { color: winColor }]}>{r.winningTeam}</Text>
              <Text style={histStyles.resultType} numberOfLines={1}>
                {RESULT_SHORT[r.type] || r.type}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

// ── Countdown bar ───────────────────────────────────────────────────────────

const CountdownBar = memo(function CountdownBar() {
  const [secs, setSecs] = useState(AUTO_ADVANCE_SECS);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const fillPct = (secs / AUTO_ADVANCE_SECS) * 100;

  return (
    <View style={countdownStyles.wrap}>
      <View style={countdownStyles.track}>
        <View style={[countdownStyles.fill, { width: `${fillPct}%` }]} />
      </View>
      <View style={countdownStyles.row}>
        <Text style={countdownStyles.label}>Next round in {secs}s</Text>
        <Pressable
          style={countdownStyles.skipBtn}
          onPress={() => WsNextRound()}
        >
          <Text style={countdownStyles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
});

// ── Main component ──────────────────────────────────────────────────────────

const MendikotScoreBoard = memo(({ phase }) => {
  const scoringResult    = useSelector((s) => s.game.scoringResult);
  const sessionTotals    = useSelector((s) => s.game.session_totals) || { A: {}, B: {} };
  const roundResults     = useSelector((s) => s.game.round_results) || [];
  const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
  const totalRounds      = useSelector((s) => s.game.totalRounds) || 1;

  const isSeries  = phase === 'series-finished';
  const winnerTeam = scoringResult?.winningTeam;
  const bannerBg    = winnerTeam === 'A' ? 'rgba(56,189,248,0.15)' : 'rgba(244,114,182,0.15)';
  const bannerBorder = winnerTeam === 'A' ? 'rgba(56,189,248,0.4)' : 'rgba(244,114,182,0.4)';

  const resultBanner = scoringResult ? (
    <View style={[styles.banner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
      <Text style={styles.bannerWinner}>Team {scoringResult.winningTeam} Wins!</Text>
      <Text style={styles.bannerType}>{RESULT_LABELS[scoringResult.type] || scoringResult.type}</Text>
    </View>
  ) : null;

  if (!isSeries) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {resultBanner}
        <View style={styles.card}>
          <RoundHistoryTable roundResults={roundResults} />
        </View>
        <CountdownBar key={currentRoundNumber} />
      </ScrollView>
    );
  }

  // Series-end: full summary
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {resultBanner}

      <View style={styles.card}>
        <RoundHistoryTable roundResults={roundResults} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Session Totals — {totalRounds} round{totalRounds !== 1 ? 's' : ''}
        </Text>
        <View style={styles.table}>
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

      <Text style={styles.seriesDone}>Series complete! 🎉</Text>
    </ScrollView>
  );
});

MendikotScoreBoard.displayName = 'MendikotScoreBoard';
export default MendikotScoreBoard;

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

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

  // Session totals table
  table: { gap: 2 },
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

  seriesDone: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

// ── History table styles ──────────────────────────────────────────────────

const histStyles = StyleSheet.create({
  table: { gap: 2 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.18)',
  },
  th: {
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  thNum: { width: 22, textAlign: 'center' },
  thTeam: { flex: 1, textAlign: 'center' },
  thResult: { flex: 1, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 4,
  },

  numCell: {
    width: 22,
    textAlign: 'center',
    fontSize: 11,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },

  teamCellWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  tensStack: {
    position: 'relative',
    overflow: 'visible',
  },
  tensCard: {
    position: 'absolute',
    top: 0,
  },
  noTens: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.creamMuted,
    fontStyle: 'italic',
    width: HIST_CARD_W,
    textAlign: 'center',
  },

  tricksBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  tricksBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bodyBold,
    fontWeight: '900',
    color: '#000',
    lineHeight: 11,
  },

  resultCellWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  resultWinner: {
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
    fontSize: 11,
  },
  resultType: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.creamMuted,
    textAlign: 'center',
  },
});

// ── Countdown styles ──────────────────────────────────────────────────────

const countdownStyles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingVertical: spacing.sm,
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  skipBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  skipText: {
    fontSize: 11,
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
  },
});
