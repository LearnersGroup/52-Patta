import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { socket } from '../../../api/socket';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import { colors, fonts, panelStyle, spacing } from '../../../styles/theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const GAME_TYPE_ICON = {
  kaliteri:  require('../../../../assets/Icons/Kaliteri_Icon.png'),
  judgement: require('../../../../assets/Icons/Judgement_Icon.png'),
  mendikot:  require('../../../../assets/Icons/Mendi_Icon.png'),
};

const RANK_COLOR = { 1: colors.gold, 2: '#A8A9AD', 3: '#CD7F32' };

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Series card (matches log page SeriesCard exactly) ─────────────────────────

function SeriesCard({ item, userId, onPress }) {
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

// ── Main component ────────────────────────────────────────────────────────────

export default function RoomLog({ roomId, userId }) {
  const { isAuthResolved } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isAuthResolved) return;

    mountedRef.current = true;

    apiClient
      .get(`/game-log/room/${roomId}`, { params: { kind: 'series' } })
      .then((res) => {
        if (mountedRef.current) setLogs(res.data.logs || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    const onAppend = (entry) => {
      if (mountedRef.current) setLogs((prev) => [...prev, entry]);
    };
    socket.on('room-series-log-append', onAppend);

    return () => {
      mountedRef.current = false;
      socket.off('room-series-log-append', onAppend);
    };
  }, [roomId, isAuthResolved]);

  const openSeries = (item) => {
    const seriesId = item.seriesId?.toString?.() || item.seriesId;
    router.push({ pathname: '/log/[seriesId]', params: { seriesId } });
  };

  if (loading) {
    return <ActivityIndicator size="small" color={colors.gold} style={{ marginTop: spacing.sm }} />;
  }

  if (logs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Past Games</Text>
      <View style={styles.list}>
        {logs.map((entry, i) => (
          <SeriesCard key={entry._id || i} item={entry} userId={userId} onPress={openSeries} />
        ))}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  list: {
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
