import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../src/api/apiClient';
import { useAuth } from '../../src/hooks/useAuth';
import AppBackground from '../../src/components/shared/AppBackground';
import {
  colors,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../src/styles/theme';

const GAME_TYPE_LABEL = {
  kaliteri: 'Kaliteri',
  judgement: 'Judgement',
  mendikot: 'Mendikot',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function SeriesCard({ item, onPress }) {
  const myRank = item.finalRankings?.[0]; // first = winner; we find user's rank below
  const totalGames = item.gameRows?.length ?? 0;

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.cardTop}>
        <Text style={styles.gameType}>{GAME_TYPE_LABEL[item.gameType] || item.gameType}</Text>
        <Text style={styles.date}>{formatDate(item.finishedAt)}</Text>
      </View>
      <View style={styles.cardMid}>
        <Text style={styles.stat}>{totalGames} game{totalGames !== 1 ? 's' : ''}</Text>
        <Text style={styles.statDot}>·</Text>
        {item.finalRankings?.slice(0, 3).map((r, i) => (
          <Text key={i} style={[styles.rankChip, r.rank === 1 && styles.rankChipWin]}>
            {r.rank === 1 ? '🥇 ' : ''}{r.name} {r.score}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

export default function LogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [series, setSeries] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const fetchSeries = useCallback(async (cursor = null) => {
    try {
      const params = { limit: 20 };
      if (cursor) params.cursor = cursor;
      const res = await apiClient.get('/game-log/me', { params });
      return res.data;
    } catch (e) {
      throw e;
    }
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

  const openSeries = (item) => {
    router.push({ pathname: '/log/[seriesId]', params: { seriesId: item.seriesId } });
  };

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
          renderItem={({ item }) => <SeriesCard item={item} onPress={openSeries} />}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.gold} style={{ margin: spacing.md }} /> : null
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
  errorText: {
    fontFamily: fonts.body,
    color: colors.redSuit,
    fontSize: 14,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 14,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameType: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 1,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
  },
  cardMid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stat: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
  },
  statDot: {
    color: 'rgba(201,162,39,0.4)',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  rankChip: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.cream,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankChipWin: {
    backgroundColor: 'rgba(201,162,39,0.12)',
    color: colors.goldLight,
  },
});
