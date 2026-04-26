import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

function GameRow({ game }) {
  return (
    <View style={styles.gameRow}>
      <Text style={styles.gameRowNum}>Game {game.gameNumber}</Text>
      <View style={styles.gameRowScores}>
        {(game.players || []).map((p, i) => {
          const delta = game.playerDeltas?.[p.userId?.toString() ?? p.userId] ?? null;
          return (
            <View key={i} style={styles.gameRowPlayer}>
              <Text style={styles.gameRowName}>{p.name}</Text>
              {delta !== null && (
                <Text style={[styles.gameRowDelta, delta > 0 ? styles.deltaPos : styles.deltaNeg]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MendikotDetail({ data, userId }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SeriesInfoHeader series={data.series} gameRows={data.gameRows} userId={userId} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Final Rankings</Text>
        {(data.series.finalRankings || []).map((r, i) => (
          <View key={i} style={[styles.rankRow, r.rank === 1 && styles.rankRowFirst]}>
            <Text style={[styles.rankNumSmall, r.rank === 1 && styles.rankNumFirstStyle]}>#{r.rank}</Text>
            <Text style={[styles.rankName, r.rank === 1 && styles.rankNameFirst]}>{r.name}</Text>
            <Text style={[styles.rankScore, r.rank === 1 && styles.rankScoreFirst]}>{r.score}</Text>
          </View>
        ))}
      </View>
      {data.gameRows.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Breakdown</Text>
          {data.gameRows.map((g, i) => <GameRow key={i} game={g} />)}
        </View>
      )}
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
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  rankRowFirst: { backgroundColor: 'rgba(201,162,39,0.08)', borderRadius: 6, paddingHorizontal: spacing.sm },
  rankNumSmall: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.creamMuted, width: 28 },
  rankNumFirstStyle: { color: colors.gold },
  rankName: { fontFamily: fonts.body, fontSize: 14, color: colors.cream, flex: 1 },
  rankNameFirst: { fontFamily: fonts.bodyBold, color: colors.goldLight },
  rankScore: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.cream },
  rankScoreFirst: { color: colors.goldLight },
  gameRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.1)',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  gameRowNum: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1 },
  gameRowScores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gameRowPlayer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gameRowName: { fontFamily: fonts.body, fontSize: 13, color: colors.cream },
  gameRowDelta: { fontFamily: fonts.bodyBold, fontSize: 13 },
  deltaPos: { color: colors.ready },
  deltaNeg: { color: colors.redSuit },
});
