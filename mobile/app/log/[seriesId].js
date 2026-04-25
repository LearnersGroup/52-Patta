import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '../../src/api/apiClient';
import AppBackground from '../../src/components/shared/AppBackground';
import {
  colors,
  fonts,
  panelStyle,
  spacing,
} from '../../src/styles/theme';

const GAME_TYPE_LABEL = {
  kaliteri: 'Kaliteri',
  judgement: 'Judgement',
  mendikot: 'Mendikot',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function RankRow({ rank, name, score, isFirst }) {
  return (
    <View style={[styles.rankRow, isFirst && styles.rankRowFirst]}>
      <Text style={[styles.rankNum, isFirst && styles.rankNumFirst]}>#{rank}</Text>
      <Text style={[styles.rankName, isFirst && styles.rankNameFirst]}>{name}</Text>
      <Text style={[styles.rankScore, isFirst && styles.rankScoreFirst]}>{score}</Text>
    </View>
  );
}

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

export default function SeriesDetailScreen() {
  const { seriesId } = useLocalSearchParams();
  const router = useRouter();
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
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Series header */}
          <View style={styles.headerCard}>
            <Text style={styles.gameTypeLabel}>
              {GAME_TYPE_LABEL[data.series.gameType] || data.series.gameType}
            </Text>
            <Text style={styles.dateText}>{formatDate(data.series.finishedAt)}</Text>
            <Text style={styles.metaStat}>
              {data.gameRows.length} game{data.gameRows.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Final rankings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Final Rankings</Text>
            {(data.series.finalRankings || []).map((r, i) => (
              <RankRow key={i} rank={r.rank} name={r.name} score={r.score} isFirst={r.rank === 1} />
            ))}
          </View>

          {/* Per-game breakdown */}
          {data.gameRows.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Game Breakdown</Text>
              {data.gameRows.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </View>
          )}
        </ScrollView>
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
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: 'Lato_400Regular',
    fontSize: 16,
    color: colors.gold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Lato_400Regular',
    color: colors.redSuit,
    fontSize: 14,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  headerCard: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.xs,
  },
  gameTypeLabel: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 1.5,
  },
  dateText: {
    fontFamily: 'Lato_400Regular',
    fontSize: 13,
    color: colors.creamMuted,
  },
  metaStat: {
    fontFamily: 'Lato_400Regular',
    fontSize: 12,
    color: colors.creamMuted,
  },

  section: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  rankRowFirst: {
    backgroundColor: 'rgba(201,162,39,0.08)',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
  },
  rankNum: {
    fontFamily: 'Lato_700Bold',
    fontSize: 14,
    color: colors.creamMuted,
    width: 28,
  },
  rankNumFirst: {
    color: colors.gold,
  },
  rankName: {
    fontFamily: 'Lato_400Regular',
    fontSize: 14,
    color: colors.cream,
    flex: 1,
  },
  rankNameFirst: {
    fontFamily: 'Lato_700Bold',
    color: colors.goldLight,
  },
  rankScore: {
    fontFamily: 'Lato_700Bold',
    fontSize: 14,
    color: colors.cream,
  },
  rankScoreFirst: {
    color: colors.goldLight,
  },

  gameRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.1)',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  gameRowNum: {
    fontFamily: 'Lato_700Bold',
    fontSize: 12,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gameRowScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gameRowPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gameRowName: {
    fontFamily: 'Lato_400Regular',
    fontSize: 13,
    color: colors.cream,
  },
  gameRowDelta: {
    fontFamily: 'Lato_700Bold',
    fontSize: 13,
  },
  deltaPos: { color: colors.ready },
  deltaNeg: { color: colors.redSuit },
});
