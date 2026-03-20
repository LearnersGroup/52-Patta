import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  pillStyle,
  shadows,
  spacing,
  typography,
} from '../../../styles/theme';

function getPlayerId(player) {
  return player?.playerId?._id?.toString?.() || player?.playerId?.toString?.() || '';
}

export default function LobbyPlayerList({ players = [], isAdmin = false, userId = '', onKick }) {
  if (!players.length) {
    return <Text style={styles.emptyText}>Waiting for players to join...</Text>;
  }

  return (
    <View style={styles.grid}>
      {players.map((player, idx) => {
        const pid = getPlayerId(player);
        const name = player?.playerId?.name || 'Player';
        const ready = !!player?.ready;
        const avatar = player?.playerId?.avatar;
        const canKick = isAdmin && pid && pid !== userId;

        return (
          <View key={`${pid || name}_${idx}`} style={[styles.card, ready && styles.cardReady]}>
            <View style={styles.avatar}>
              {avatar ? (
                <Text style={styles.avatarText}>🧑</Text>
              ) : (
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </View>

            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>

            <View style={styles.statusRow}>
              <View style={[styles.readyDot, ready && styles.readyDotOn]} />
              <Text style={styles.statusText}>{ready ? 'Ready' : 'Not ready'}</Text>
            </View>

            {canKick ? (
              <Pressable style={[buttonStyles.base, buttonStyles.danger, buttonStyles.small, { marginTop: 2 }]} onPress={() => onKick?.(pid, name)}>
                <Text style={[buttonStyles.dangerText, buttonStyles.smallText]}>Kick</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: typography.bodySmall.fontSize,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    ...panelStyle,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.bgPanelLight,
  },
  cardReady: {
    borderColor: colors.readyBorder,
    backgroundColor: colors.readyBg,
    shadowColor: colors.ready,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  avatarText: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 14,
  },
  name: {
    fontFamily: fonts.bodyBold,
    color: colors.cream,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.creamMuted,
  },
  readyDotOn: {
    backgroundColor: colors.ready,
    shadowColor: colors.ready,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    ...typography.captionSmall,
    fontFamily: fonts.body,
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
