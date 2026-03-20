import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WsReturnToLobby } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, shadows, spacing, typography } from '../../../styles/theme';

const BADGES = {
  1: { emoji: '🥇', tone: '#f4d35e', borderColor: colors.gold },
  2: { emoji: '🥈', tone: '#d7dee8', borderColor: '#c0c0c0' },
  3: { emoji: '🥉', tone: '#d6a77a', borderColor: '#cd7f32' },
};

export default function SeriesFinishedPanel({ finalRankings = [], scores = {}, seatOrder = [], getName, userId }) {
  const rankings = (finalRankings || []).length
    ? finalRankings
    : (seatOrder || [])
        .map((pid) => ({
          playerId: pid,
          name: getName(pid),
          score: scores?.[pid] || 0,
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  const top = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>🏆 Series Complete</Text>

      <View style={styles.podiumRow}>
        {top.map((player) => {
          const badge = BADGES[player.rank] || { emoji: '🎖️', tone: colors.goldLight, borderColor: colors.borderGold };
          const isMe = player.playerId === userId;
          return (
            <View key={player.playerId} style={[styles.podiumCard, { borderColor: badge.borderColor }, isMe && styles.meCard]}>
              <View style={[styles.avatarCircle, { borderColor: badge.borderColor }]}>
                <Text style={styles.avatarInitial}>
                  {(isMe ? 'You' : (player.name || getName(player.playerId) || '?')).charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.medal, { color: badge.tone }]}>{badge.emoji}</Text>
              <Text style={styles.name} numberOfLines={1}>{isMe ? 'You' : (player.name || getName(player.playerId))}</Text>
              <Text style={styles.score}>{player.score || 0} pts</Text>
            </View>
          );
        })}
      </View>

      {rest.length ? (
        <View style={styles.restList}>
          {rest.map((player) => {
            const isMe = player.playerId === userId;
            return (
              <View key={player.playerId} style={[styles.restRow, isMe && styles.meCard]}>
                <Text style={styles.rank}>#{player.rank}</Text>
                <Text style={styles.restName}>{isMe ? 'You' : (player.name || getName(player.playerId))}</Text>
                <Text style={styles.restScore}>{player.score || 0}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Pressable style={styles.lobbyBtn} onPress={WsReturnToLobby}>
        <Text style={styles.lobbyBtnText}>Return to Lobby</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.cream,
    fontSize: 20,
    textAlign: 'center',
  },
  podiumRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  podiumCard: {
    flex: 1,
    ...panelStyle,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  meCard: {
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 20,
  },
  medal: {
    fontSize: 24,
  },
  name: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  score: {
    fontFamily: fonts.heading,
    color: colors.goldLight,
    fontWeight: '700',
    fontSize: 13,
  },
  restList: {
    ...panelStyle,
    borderRadius: 10,
    overflow: 'hidden',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderGold,
    gap: spacing.sm,
  },
  rank: {
    fontFamily: fonts.heading,
    width: 34,
    color: colors.goldLight,
    fontWeight: '700',
    fontSize: 13,
  },
  restName: {
    fontFamily: fonts.body,
    flex: 1,
    color: colors.cream,
    fontWeight: '600',
    fontSize: 13,
  },
  restScore: {
    fontFamily: fonts.heading,
    color: colors.creamMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  lobbyBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    width: '100%',
  },
  lobbyBtnText: {
    ...buttonStyles.primaryText,
  },
});
