import { memo, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../../styles/theme';
import AvatarImage from '../../shared/AvatarImage';

const TEAM_A_COLOR  = '#38bdf8';
const TEAM_B_COLOR  = '#f472b6';
const TEAM_A_DIM    = 'rgba(56, 189, 248, 0.10)';
const TEAM_B_DIM    = 'rgba(244, 114, 182, 0.10)';
const TEAM_A_BORDER = 'rgba(56, 189, 248, 0.30)';
const TEAM_B_BORDER = 'rgba(244, 114, 182, 0.30)';

// Avatar diameter (fixed — looks good at 3-per-row on any device)
const AVATAR_SIZE = 62;
const RING_PAD    = 3;   // space between ring border and avatar
const RING_SIZE   = AVATAR_SIZE + RING_PAD * 2 + 4; // border adds ~2px each side

function getPlayerId(player) {
  return player?.playerId?._id?.toString?.() || player?.playerId?.toString?.() || '';
}

const PlayerCell = memo(function PlayerCell({ pid, name, ready, avatar, canTap, cellWidth, onKickTarget, teamColor }) {
  return (
    <Pressable
      style={[styles.cell, cellWidth ? { width: cellWidth } : null]}
      onPress={() => canTap && onKickTarget({ pid, name })}
    >
      <View style={[
          styles.avatarRing,
          ready ? styles.avatarRingReady : styles.avatarRingIdle,
          ready && teamColor ? { borderColor: teamColor, shadowColor: teamColor } : null,
        ]}>
        <View style={[styles.avatarInner, teamColor ? { backgroundColor: teamColor } : null]}>
          {avatar ? (
            <AvatarImage uri={avatar} width="100%" height="100%" />
          ) : (
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
      </View>
      <Text numberOfLines={1} style={styles.name}>{name}</Text>
    </Pressable>
  );
});

const PlayerGrid = memo(function PlayerGrid({ players, isAdmin, userId, onKickTarget, teamColor }) {
  const [width, setWidth] = useState(0);
  const COL_GAP   = spacing.sm;
  const cellWidth = width > 0 ? (width - COL_GAP * 2) / 3 : undefined;

  if (!players.length) {
    return <Text style={styles.emptyText}>No players yet</Text>;
  }
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {players.map((player, idx) => {
        const pid    = getPlayerId(player);
        const name   = player?.playerId?.name || 'Player';
        const ready  = !!player?.ready;
        const avatar = player?.playerId?.avatar || '';
        const canTap = isAdmin && pid && pid !== userId;

        return (
          <PlayerCell
            key={pid || `${name}_${idx}`}
            pid={pid}
            name={name}
            ready={ready}
            avatar={avatar}
            canTap={canTap}
            cellWidth={cellWidth}
            onKickTarget={onKickTarget}
            teamColor={teamColor}
          />
        );
      })}
    </View>
  );
});

const TeamSection = memo(function TeamSection({
  team, teamPlayers, sectionStyle, color,
  myTeam, iAmReady, isAdmin, userId, onSwitchTeam, onKickTarget,
}) {
  const isOpponent = myTeam !== null && myTeam !== team;
  const canSwitch = isOpponent && !iAmReady;
  const Container = canSwitch ? Pressable : View;
  return (
    <Container
      style={[styles.teamSection, sectionStyle, canSwitch && styles.teamSectionTappable]}
      onPress={canSwitch ? onSwitchTeam : undefined}
    >
      <View style={styles.teamHalfHeader}>
        <View style={[styles.teamDot, { backgroundColor: color }]} />
        <Text style={[styles.teamLabel, { color }]}>Team {team}</Text>
        <Text style={styles.teamCount}>({teamPlayers.length})</Text>
        {canSwitch ? <Text style={styles.joinHint}>tap to join</Text> : null}
      </View>
      <PlayerGrid
        players={teamPlayers}
        isAdmin={isAdmin}
        userId={userId}
        onKickTarget={onKickTarget}
        teamColor={color}
      />
    </Container>
  );
});

const LobbyPlayerList = memo(function LobbyPlayerList({
  players = [],
  isAdmin = false,
  userId = '',
  onKick,
  // Mendikot team split — when provided renders two halves instead of one grid
  teamAIds = null,
  teamBIds = null,
  onSwitchTeam,
}) {
  const [kickTarget, setKickTarget] = useState(null);
  const [gridWidth, setGridWidth] = useState(0);

  const COL_GAP    = spacing.sm;
  const TEAM_PAD_H = spacing.sm * 2; // left + right paddingHorizontal on each teamSection
  const isMendikot = teamAIds !== null && teamBIds !== null;

  const cellWidth = gridWidth > 0
    ? ((isMendikot ? gridWidth - TEAM_PAD_H : gridWidth) - COL_GAP * 2) / 3
    : undefined;

  const teamAPlayers = useMemo(() =>
    (teamAIds || []).flatMap((id) => {
      const found = players.find((p) => getPlayerId(p) === id);
      return found ? [found] : [];
    }),
  [teamAIds, players]);

  const teamBPlayers = useMemo(() =>
    (teamBIds || []).flatMap((id) => {
      const found = players.find((p) => getPlayerId(p) === id);
      return found ? [found] : [];
    }),
  [teamBIds, players]);

  const myTeam = isMendikot
    ? (teamAIds || []).includes(userId) ? 'A' : (teamBIds || []).includes(userId) ? 'B' : null
    : null;

  const iAmReady = isMendikot
    ? !!(players.find((p) => getPlayerId(p) === userId)?.ready)
    : false;

  if (!players.length) {
    return <Text style={styles.emptyText}>Waiting for players to join...</Text>;
  }

  return (
    <>
      <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {isMendikot ? (
          /* ── Team split layout ─────────────────────────────────────────── */
          <View style={styles.teamSplit}>
            <TeamSection
              team="A"
              teamPlayers={teamAPlayers}
              sectionStyle={styles.teamSectionA}
              color={TEAM_A_COLOR}
              myTeam={myTeam}
              iAmReady={iAmReady}
              isAdmin={isAdmin}
              userId={userId}
              onSwitchTeam={onSwitchTeam}
              onKickTarget={setKickTarget}
            />
            <TeamSection
              team="B"
              teamPlayers={teamBPlayers}
              sectionStyle={styles.teamSectionB}
              color={TEAM_B_COLOR}
              myTeam={myTeam}
              iAmReady={iAmReady}
              isAdmin={isAdmin}
              userId={userId}
              onSwitchTeam={onSwitchTeam}
              onKickTarget={setKickTarget}
            />
          </View>
        ) : (
          /* ── Standard single grid ──────────────────────────────────────── */
          <PlayerGrid
            players={players}
            isAdmin={isAdmin}
            userId={userId}
            onKickTarget={setKickTarget}
          />
        )}
      </View>

      {/* ── Kick confirmation modal ── */}
      <Modal
        visible={!!kickTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setKickTarget(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setKickTarget(null)}>
          {/* Inner Pressable prevents closing when tapping inside the dialog */}
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.dialogTitle}>Remove Player?</Text>
            <Text style={styles.dialogBody}>
              <Text style={styles.dialogName}>{kickTarget?.name}</Text>
              {' '}will be removed from the room.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogBtn, styles.dialogBtnCancel]}
                onPress={() => setKickTarget(null)}
              >
                <Text style={styles.dialogBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogBtn, styles.dialogBtnKick]}
                onPress={() => {
                  onKick?.(kickTarget.pid);
                  setKickTarget(null);
                }}
              >
                <Text style={styles.dialogBtnKickText}>Kick</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

export default LobbyPlayerList;

const styles = StyleSheet.create({
  emptyText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: typography.bodySmall.fontSize,
  },

  // ── Team split ─────────────────────────────────────────────────────────────
  teamSplit: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  teamSection: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  teamSectionA: {
    backgroundColor: TEAM_A_DIM,
    borderWidth: 1,
    borderColor: TEAM_A_BORDER,
  },
  teamSectionB: {
    backgroundColor: TEAM_B_DIM,
    borderWidth: 1,
    borderColor: TEAM_B_BORDER,
  },
  teamSectionTappable: {
    opacity: 0.85,
  },
  teamHalfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 2,
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  teamLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    flex: 1,
    letterSpacing: 0.5,
  },
  teamCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.creamMuted,
  },
  joinHint: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.creamMuted,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  // ── Grid ───────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },

  // ── Avatar ring ────────────────────────────────────────────────────────────
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    padding: RING_PAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingIdle: {
    borderColor: colors.borderGold,
  },
  avatarRingReady: {
    borderColor: colors.ready,
    shadowColor: colors.ready,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.bgPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.gold,
  },

  // ── Name & status ──────────────────────────────────────────────────────────
  name: {
    fontFamily: fonts.bodyBold,
    color: colors.cream,
    fontSize: 13,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.creamMuted,
  },
  dotReady: {
    backgroundColor: colors.ready,
    shadowColor: colors.ready,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  statusLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusLabelReady: {
    color: colors.readyLight,
  },

  // ── Kick modal ─────────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    ...panelStyle,
    width: '100%',
    maxWidth: 340,
    padding: spacing.lg,
    gap: spacing.md,
  },
  dialogTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.gold,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  dialogBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cream,
    textAlign: 'center',
    lineHeight: 20,
  },
  dialogName: {
    fontFamily: fonts.bodyBold,
    color: colors.goldLight,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dialogBtn: {
    ...buttonStyles.base,
    flex: 1,
    paddingVertical: 12,
  },
  dialogBtnCancel: {
    ...buttonStyles.secondary,
  },
  dialogBtnCancelText: {
    ...buttonStyles.secondaryText,
  },
  dialogBtnKick: {
    ...buttonStyles.danger,
  },
  dialogBtnKickText: {
    ...buttonStyles.dangerText,
  },
});
