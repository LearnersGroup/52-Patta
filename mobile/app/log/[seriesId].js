import { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CardFace from '../../src/components/game/CardFace';
import { cardKey } from '../../src/components/game/utils/cardMapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '../../src/api/apiClient';
import { useAuth } from '../../src/hooks/useAuth';
import AppBackground from '../../src/components/shared/AppBackground';
import SeriesFinishedPanel from '../../src/components/game/board/SeriesFinishedPanel';
import { colors, fonts, panelStyle, spacing } from '../../src/styles/theme';

// ── Shared helpers ────────────────────────────────────────────────────────────

const GAME_TYPE_LABEL = { kaliteri: 'Kaliteri', judgement: 'Judgement', mendikot: 'Mendikot' };

const GAME_TYPE_ICON = {
  kaliteri: require('../../assets/Icons/Kaliteri_Icon.png'),
  judgement: require('../../assets/Icons/Judgement_Icon.png'),
  mendikot: require('../../assets/Icons/Mendi_Icon.png'),
};

const TEAM_A_COLOR = '#38bdf8';
const TEAM_B_COLOR = '#f472b6';

const HIST_CARD_W = 18;
const HIST_CARD_H = Math.round(HIST_CARD_W * 1.4);
const HIST_STACK_OFFSET = Math.round(HIST_CARD_W * 0.22);

const WIN_TYPE_LABELS = {
  'win-by-tricks':    'Won by Tricks',
  'win-by-mendi':     'Won by Tens (Mendi)',
  mendikot:           'Mendikot! (All 4 Tens)',
  '52-card mendikot': '52-Card Mendikot! (All Tricks)',
};

const WIN_TYPE_KEYS = ['52-card mendikot', 'mendikot', 'win-by-mendi', 'win-by-tricks'];

const RESULT_SHORT = {
  'win-by-tricks':    'Tricks',
  'win-by-mendi':     'Tens',
  mendikot:           'Mendikot!',
  '52-card mendikot': '52 Patta!',
};

const RANK_COLOR = { 1: colors.gold, 2: '#A8A9AD', 3: '#CD7F32' };

function rankSuffix(n) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Header card (mirrors the log-list SeriesCard) ─────────────────────────────

function SeriesInfoHeader({ series, gameRows, userId }) {
  const totalPlayers = series.playerCount ?? series.finalRankings?.length ?? series.players?.length ?? 0;
  const deckCount = series.deckCount ?? 1;
  const totalGames = gameRows?.length ?? 0;

  const metaParts = [];
  if (totalPlayers) metaParts.push(`${totalPlayers} players`);
  metaParts.push(`${deckCount} deck${deckCount !== 1 ? 's' : ''}`);
  if (series.variant) metaParts.push(series.variant);
  metaParts.push(`${totalGames} game${totalGames !== 1 ? 's' : ''}`);
  const meta = metaParts.join('  ·  ');

  const myRankEntry = series.finalRankings?.find(
    (r) => r.playerId?.toString() === userId?.toString()
  );
  const myRank = myRankEntry?.rank ?? null;

  const showRanking =
    (series.gameType === 'kaliteri' || series.gameType === 'judgement') &&
    myRank !== null && totalPlayers > 0;
  const showWinLoss = series.gameType === 'mendikot' && myRank !== null;
  const isWin = myRank === 1;
  const rankColor = RANK_COLOR[myRank] ?? colors.creamMuted;

  const result = showRanking ? (
    <View style={styles.rankContainer}>
      <Text style={[styles.rankNum, { color: rankColor }]}>{myRank}</Text>
      <Text style={[styles.rankSuffix, { color: rankColor }]}>{rankSuffix(myRank)}</Text>
    </View>
  ) : showWinLoss ? (
    <Text style={[styles.winLoss, isWin ? styles.win : styles.loss]}>
      {isWin ? 'Win' : 'Loss'}
    </Text>
  ) : null;

  return (
    <View style={styles.headerCard}>
      <Image
        source={GAME_TYPE_ICON[series.gameType]}
        style={styles.headerIcon}
        resizeMode="contain"
      />
      <View style={styles.headerContent}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerGameType}>
            {GAME_TYPE_LABEL[series.gameType] || series.gameType}
          </Text>
          <Text style={styles.headerDate}>{formatDate(series.finishedAt)}</Text>
        </View>
        <View style={styles.headerBottomRow}>
          {result}
          <Text style={styles.headerMeta} numberOfLines={1}>{meta}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Mendikot detail ───────────────────────────────────────────────────────────

function WinTypeBreakdown({ sessionTotals }) {
  const totals = sessionTotals || { A: {}, B: {} };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Win Type Breakdown</Text>
      <View style={styles.winTable}>
        <View style={styles.winTableHeader}>
          <Text style={[styles.winTableCell, styles.winTableLabel]} />
          <Text style={[styles.winTableCell, styles.winTableTeam, { color: TEAM_A_COLOR }]}>Team A</Text>
          <Text style={[styles.winTableCell, styles.winTableTeam, { color: TEAM_B_COLOR }]}>Team B</Text>
        </View>
        {WIN_TYPE_KEYS.map((key) => {
          const aVal = totals.A?.[key] || 0;
          const bVal = totals.B?.[key] || 0;
          const aWins = aVal > bVal;
          const bWins = bVal > aVal;
          return (
            <View key={key} style={styles.winTableRow}>
              <Text style={[styles.winTableCell, styles.winTableLabel]} numberOfLines={1}>
                {WIN_TYPE_LABELS[key]}
              </Text>
              <Text style={[styles.winTableCell, styles.winTableVal, aWins && styles.winHighlight, { color: TEAM_A_COLOR }]}>
                {aVal}
              </Text>
              <Text style={[styles.winTableCell, styles.winTableVal, bWins && styles.winHighlight, { color: TEAM_B_COLOR }]}>
                {bVal}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

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

function RoundHistoryTable({ roundResults }) {
  if (!roundResults || roundResults.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Round History</Text>
      <View style={histStyles.table}>
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
    </View>
  );
}

function MendikotDetail({ data, userId }) {
  const roundResults = data.series.round_results ||
    data.gameRows.map((g, i) => ({ roundNumber: i + 1, ...g.scoringResult })).filter((r) => r.type);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SeriesInfoHeader series={data.series} gameRows={data.gameRows} userId={userId} />
      <WinTypeBreakdown sessionTotals={data.series.session_totals} />
      <RoundHistoryTable roundResults={roundResults} />
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SeriesDetailScreen() {
  const { seriesId } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const userId = profile?._id?.toString();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!seriesId) return;
    apiClient
      .get(`/game-log/me/${seriesId}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load series details'))
      .finally(() => setLoading(false));
  }, [seriesId]);

  const panelProps = useMemo(() => {
    if (!data) return null;
    const { series, gameRows } = data;

    const scores = {};
    const nameMap = {};
    for (const r of series.finalRankings || []) {
      const pid = r.playerId?.toString();
      scores[pid] = r.score;
      nameMap[pid] = r.name;
    }

    const playerAvatars = {};
    for (const p of series.players || []) {
      playerAvatars[p.userId?.toString()] = p.avatar;
    }

    const seatOrder = (series.finalRankings || []).map((r) => r.playerId?.toString());
    const getName = (pid) => nameMap[pid?.toString()] || pid;
    const roundResults = gameRows.map((g) => g.scoringResult).filter(Boolean);

    return {
      finalRankings: (series.finalRankings || []).map((r) => ({
        ...r,
        playerId: r.playerId?.toString(),
      })),
      scores,
      seatOrder,
      getName,
      userId,
      playerAvatars,
      gameType: series.gameType,
      roundResults,
      gameHistory: gameRows,
      tricksWon: {},
      bidding: {},
      phase: 'series-finished',
      onReturnToLobby: () => router.back(),
      isLogView: true,
      renderHeader: () => (
        <SeriesInfoHeader series={series} gameRows={gameRows} userId={userId} />
      ),
    };
  }, [data, userId, router]);

  const gameType = data?.series?.gameType;
  const showPanel = gameType === 'kaliteri' || gameType === 'judgement';

  return (
    <AppBackground>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : showPanel ? (
        <SeriesFinishedPanel {...panelProps} />
      ) : (
        <MendikotDetail data={data} userId={userId} />
      )}
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.body, fontSize: 16, color: colors.gold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: fonts.body, color: colors.redSuit, fontSize: 14 },

  // ── Header card ─────────────────────────────────────────────────────────────
  headerCard: {
    ...panelStyle,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  headerContent: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerGameType: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.gold,
    letterSpacing: 1,
  },
  headerDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(201,162,39,0.5)',
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  headerMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    opacity: 0.8,
    flex: 1,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rankNum: {
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 30,
    color: colors.gold,
  },
  rankSuffix: {
    fontFamily: fonts.heading,
    fontSize: 13,
    marginLeft: 1,
  },
  winLoss: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  win: { color: colors.gold },
  loss: { color: colors.creamMuted },

  // ── Mendikot sections ────────────────────────────────────────────────────────
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  section: { ...panelStyle, padding: spacing.md, gap: spacing.sm },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },

  // Win type breakdown table
  winTable: { gap: 2 },
  winTableHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  winTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  winTableCell: { fontSize: 13, fontFamily: fonts.body },
  winTableLabel: { flex: 1, color: colors.creamMuted, paddingRight: spacing.xs },
  winTableTeam: { width: 58, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12 },
  winTableVal: { width: 58, textAlign: 'center', fontFamily: fonts.bodyBold },
  winHighlight: { fontFamily: fonts.bodyBold, textDecorationLine: 'underline' },

});

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
  teamCellWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tensStack: { position: 'relative', overflow: 'visible' },
  tensCard: { position: 'absolute', top: 0 },
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
  resultCellWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  resultWinner: { fontFamily: fonts.bodyBold, fontSize: 13, fontWeight: '700' },
  resultType: { fontFamily: fonts.body, fontSize: 10, color: colors.creamMuted },
});
