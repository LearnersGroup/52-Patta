import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buttonStyles, colors, fonts, panelStyle, spacing } from '../../../styles/theme';

const TEAM_A_COLOR = '#38bdf8'; // sky-blue
const TEAM_B_COLOR = '#f472b6'; // pink
const TEAM_A_DIM   = 'rgba(56, 189, 248, 0.15)';
const TEAM_B_DIM   = 'rgba(244, 114, 182, 0.15)';
const TEAM_A_BORDER = 'rgba(56, 189, 248, 0.35)';
const TEAM_B_BORDER = 'rgba(244, 114, 182, 0.35)';

function PlayerEntry({ id, name, isMe, isReady }) {
  return (
    <View style={[styles.playerRow, isMe && styles.playerRowMe]}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{(name || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {name}{isMe ? ' (you)' : ''}
      </Text>
      {isReady ? <View style={styles.readyDot} /> : null}
    </View>
  );
}

const MendikotTeamLobby = memo(({ roomData, players, userId, isAdmin, onSwitchTeam, onRandomizeTeams }) => {
  const teamAIds = (roomData?.team_a_players || []).map((id) =>
    id?._id?.toString?.() || id?.toString?.()
  );
  const teamBIds = (roomData?.team_b_players || []).map((id) =>
    id?._id?.toString?.() || id?.toString?.()
  );

  const getPlayerEntry = (id) =>
    players.find((p) => {
      const pid = p.playerId?._id?.toString?.() || p.playerId?.toString?.();
      return pid === id;
    });

  const renderPlayer = (id) => {
    const p = getPlayerEntry(id);
    const name = p?.playerId?.name || p?.name || id?.slice(0, 8) || '?';
    const isMe = id === userId;
    const isReady = p?.ready ?? false;
    return <PlayerEntry key={id} id={id} name={name} isMe={isMe} isReady={isReady} />;
  };

  const allAssignedIds = [...teamAIds, ...teamBIds];
  const unassigned = players.filter((p) => {
    const pid = p.playerId?._id?.toString?.() || p.playerId?.toString?.();
    return !allAssignedIds.includes(pid);
  });

  return (
    <View style={styles.wrap}>
      {/* Two team columns */}
      <View style={styles.teamsRow}>
        {/* Team A */}
        <View style={[styles.teamColumn, styles.teamColumnA]}>
          <View style={styles.teamHeader}>
            <View style={[styles.teamDot, styles.teamDotA]} />
            <Text style={styles.teamName}>Team A</Text>
            <Text style={styles.teamCount}>({teamAIds.length})</Text>
          </View>
          <View style={styles.teamPlayers}>
            {teamAIds.length === 0
              ? <Text style={styles.emptyText}>No players yet</Text>
              : teamAIds.map(renderPlayer)}
          </View>
        </View>

        {/* Team B */}
        <View style={[styles.teamColumn, styles.teamColumnB]}>
          <View style={styles.teamHeader}>
            <View style={[styles.teamDot, styles.teamDotB]} />
            <Text style={styles.teamName}>Team B</Text>
            <Text style={styles.teamCount}>({teamBIds.length})</Text>
          </View>
          <View style={styles.teamPlayers}>
            {teamBIds.length === 0
              ? <Text style={styles.emptyText}>No players yet</Text>
              : teamBIds.map(renderPlayer)}
          </View>
        </View>
      </View>

      {/* Unassigned */}
      {unassigned.length > 0 ? (
        <View style={styles.unassigned}>
          <Text style={styles.unassignedLabel}>UNASSIGNED</Text>
          {unassigned.map((p) => {
            const id = p.playerId?._id?.toString?.() || p.playerId?.toString?.();
            return renderPlayer(id);
          })}
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actionsRow}>
        {!isAdmin ? (
          <Pressable
            style={[buttonStyles.base, buttonStyles.secondary, styles.actionBtn]}
            onPress={() => onSwitchTeam?.()}
          >
            <Text style={buttonStyles.secondaryText}>Switch Team</Text>
          </Pressable>
        ) : null}
        {isAdmin ? (
          <Pressable
            style={[buttonStyles.base, buttonStyles.secondary, styles.actionBtn]}
            onPress={() => onRandomizeTeams?.()}
          >
            <Text style={buttonStyles.secondaryText}>🔀 Randomize Teams</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

MendikotTeamLobby.displayName = 'MendikotTeamLobby';
export default MendikotTeamLobby;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },

  // Two columns side-by-side
  teamsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teamColumn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.sm,
    minHeight: 80,
    backgroundColor: colors.bgPanel,
  },
  teamColumnA: {
    borderColor: TEAM_A_BORDER,
    backgroundColor: TEAM_A_DIM,
  },
  teamColumnB: {
    borderColor: TEAM_B_BORDER,
    backgroundColor: TEAM_B_DIM,
  },

  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.xs,
  },
  teamDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  teamDotA: { backgroundColor: TEAM_A_COLOR },
  teamDotB: { backgroundColor: TEAM_B_COLOR },
  teamName: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.cream,
    flex: 1,
  },
  teamCount: {
    fontSize: 11,
    color: colors.creamMuted,
  },

  teamPlayers: {
    gap: 3,
  },
  emptyText: {
    fontSize: 12,
    color: colors.creamMuted,
    fontStyle: 'italic',
  },

  // Individual player row
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  playerRowMe: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgPanelLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: 11,
    color: colors.cream,
    fontFamily: fonts.bodyBold,
  },
  playerName: {
    fontSize: 12,
    color: colors.cream,
    flex: 1,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
    flexShrink: 0,
  },

  // Unassigned section
  unassigned: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.sm,
    gap: 3,
  },
  unassignedLabel: {
    fontSize: 10,
    color: colors.creamMuted,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: fonts.heading,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
});
