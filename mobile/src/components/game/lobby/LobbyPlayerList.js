import { memo, useState } from 'react';
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

// Avatar diameter (fixed — looks good at 3-per-row on any device)
const AVATAR_SIZE = 62;
const RING_PAD    = 3;   // space between ring border and avatar
const RING_SIZE   = AVATAR_SIZE + RING_PAD * 2 + 4; // border adds ~2px each side

function getPlayerId(player) {
  return player?.playerId?._id?.toString?.() || player?.playerId?.toString?.() || '';
}

const LobbyPlayerList = memo(function LobbyPlayerList({ players = [], isAdmin = false, userId = '', onKick }) {
  const [kickTarget, setKickTarget] = useState(null); // { pid, name }
  const [gridWidth, setGridWidth] = useState(0);

  // Derive cell width from the grid's measured width so no outer padding guessing is needed.
  const COL_GAP   = spacing.sm;  // 8 — 2 gaps for 3 columns
  const cellWidth = gridWidth > 0 ? (gridWidth - COL_GAP * 2) / 3 : undefined;

  if (!players.length) {
    return <Text style={styles.emptyText}>Waiting for players to join...</Text>;
  }

  return (
    <>
      <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {players.map((player, idx) => {
          const pid    = getPlayerId(player);
          const name   = player?.playerId?.name || 'Player';
          const ready  = !!player?.ready;
          const avatar = player?.playerId?.avatar || '';
          const canTap = isAdmin && pid && pid !== userId;

          return (
            <Pressable
              key={`${pid || name}_${idx}`}
              style={[styles.cell, { width: cellWidth }]}
              onPress={() => canTap && setKickTarget({ pid, name })}
            >
              {/* ── Avatar with ready ring ── */}
              <View style={[styles.avatarRing, ready ? styles.avatarRingReady : styles.avatarRingIdle]}>
                <View style={styles.avatarInner}>
                  {avatar ? (
                    <AvatarImage uri={avatar} width="100%" height="100%" />
                  ) : (
                    <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
              </View>

              {/* ── Name ── */}
              <Text numberOfLines={1} style={styles.name}>{name}</Text>

            </Pressable>
          );
        })}
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
