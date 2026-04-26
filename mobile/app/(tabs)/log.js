import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../src/api/apiClient';
import { useAuth } from '../../src/hooks/useAuth';
import AppBackground from '../../src/components/shared/AppBackground';
import { colors, fonts, panelStyle, spacing } from '../../src/styles/theme';

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

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}yr ago`;
}

function SeriesCard({ item, onPress, userId }) {
  const totalPlayers = item.playerCount ?? item.finalRankings?.length ?? item.players?.length ?? 0;
  const deckCount = item.deckCount ?? 1;
  const totalGames = item.gameRows?.length ?? 0;

  const metaParts = [];
  if (totalPlayers) metaParts.push(`${totalPlayers} players`);
  metaParts.push(`${deckCount} deck${deckCount !== 1 ? 's' : ''}`);
  if (item.variant) metaParts.push(item.variant);
  metaParts.push(`${totalGames} game${totalGames !== 1 ? 's' : ''}`);
  const meta = metaParts.join('  ·  ');

  const myRankEntry = item.finalRankings?.find(
    (r) => r.playerId?.toString() === userId?.toString()
  );
  const myRank = myRankEntry?.rank ?? null;

  const showRanking =
    (item.gameType === 'kaliteri' || item.gameType === 'judgement') &&
    myRank !== null && totalPlayers > 0;
  const showWinLoss = item.gameType === 'mendikot' && myRank !== null;
  const isWin = myRank === 1;
  const rankColor = RANK_COLOR[myRank] ?? colors.creamMuted;

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <Image
        source={GAME_TYPE_ICON[item.gameType]}
        style={styles.gameIcon}
        resizeMode="contain"
      />
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          {showRanking ? (
            <View style={styles.rankContainer}>
              <Text style={[styles.rankNum, { color: rankColor }]}>{myRank}</Text>
              <Text style={[styles.rankSuffix, { color: rankColor }]}>{rankSuffix(myRank)}</Text>
            </View>
          ) : showWinLoss ? (
            <Text style={[styles.winLoss, isWin ? styles.win : styles.loss]}>
              {isWin ? 'Win' : 'Loss'}
            </Text>
          ) : null}
          <Text style={styles.date}>{timeAgo(item.finishedAt)}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </View>
    </Pressable>
  );
}

export default function LogScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const userId = profile?._id?.toString();
  const [series, setSeries] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const fetchSeries = useCallback(async (cursor = null) => {
    const params = { limit: 20 };
    if (cursor) params.cursor = cursor;
    const res = await apiClient.get('/game-log/me', { params });
    return res.data;
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    fetchSeries()
      .then(({ series: rows, nextCursor: nc }) => {
        setSeries(rows);
        setNextCursor(nc);
      })
      .catch(() => setError('Failed to load game history'))
      .finally(() => setLoading(false));
  }, [user?.token, fetchSeries]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchSeries(nextCursor)
      .then(({ series: rows, nextCursor: nc }) => {
        setSeries((prev) => [...prev, ...rows]);
        setNextCursor(nc);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const openSeries = useCallback((item) => {
    router.push({ pathname: '/log/[seriesId]', params: { seriesId: item.seriesId } });
  }, [router]);

  return (
    <AppBackground>
      <View style={styles.header}>
        <Text style={styles.title}>Game Log</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : series.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No games played yet.</Text>
        </View>
      ) : (
        <FlatList
          data={series}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <SeriesCard item={item} onPress={openSeries} userId={userId} />
          )}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.gold} style={{ margin: spacing.md }} />
            ) : null
          }
        />
      )}
    </AppBackground>
  );

}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.gold,
    letterSpacing: 1.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { fontFamily: fonts.body, color: colors.redSuit, fontSize: 14 },
  emptyText: { fontFamily: fonts.body, color: colors.creamMuted, fontSize: 14 },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    ...panelStyle,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  gameIcon: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  cardContent: {
    flex: 1,
    gap: 6,
    paddingLeft: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rankNum: {
    fontFamily: fonts.heading,
    fontSize: 36,
    lineHeight: 40,
  },
  rankSuffix: {
    fontFamily: fonts.heading,
    fontSize: 16,
    marginLeft: 1,
  },
  winLoss: {
    fontFamily: fonts.heading,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  win: { color: colors.gold },
  loss: { color: colors.creamMuted },
  date: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(201,162,39,0.45)',
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    opacity: 0.7,
  },
});
