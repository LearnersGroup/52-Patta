import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { socket } from '../../../api/socket';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import {
  colors,
  dividerStyle,
  fonts,
  spacing,
} from '../../../styles/theme';

function GameLogRow({ entry }) {
  const playerList = (entry.players || [])
    .map((p) => {
      const delta = entry.playerDeltas?.[p.userId?.toString?.() ?? p.userId] ?? null;
      return `${p.name}${delta !== null ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}`;
    })
    .join(', ');

  return (
    <View style={styles.logRow}>
      <Text style={styles.logGame}>Game {entry.gameNumber}</Text>
      {playerList ? (
        <Text style={styles.logPlayers} numberOfLines={1}>{playerList}</Text>
      ) : null}
    </View>
  );
}

export default function RoomLog({ roomId }) {
  const { isAuthResolved } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Wait for auth to be resolved before fetching — avoids a race where
  // apiClient doesn't yet have the x-auth-token header set.
  useEffect(() => {
    if (!isAuthResolved) return;

    mountedRef.current = true;

    apiClient
      .get(`/game-log/room/${roomId}`)
      .then((res) => {
        if (mountedRef.current) setLogs(res.data.logs || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    const onAppend = (entry) => {
      if (mountedRef.current) {
        setLogs((prev) => [...prev, entry]);
      }
    };
    socket.on('room-log-append', onAppend);

    return () => {
      mountedRef.current = false;
      socket.off('room-log-append', onAppend);
    };
  }, [roomId, isAuthResolved]);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.gold} />
      </View>
    );
  }

  if (logs.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Games This Session</Text>
      {logs.map((entry, i) => (
        <GameLogRow key={entry._id || i} entry={entry} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  divider: {
    ...dividerStyle,
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  loadingRow: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  logGame: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.gold,
    minWidth: 52,
  },
  logPlayers: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    flex: 1,
  },
});
