import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  WsAdminKickPlayer,
  WsAdminUpdateConfig,
  WsGameStart,
  WsUserLeaveRoom,
  WsUserToggleReady,
} from '../../../api/wsEmitters';
import {
  buttonStyles,
  colors,
  dividerStyle,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../../styles/theme';
import LobbyConfigEditor from './LobbyConfigEditor';
import LobbyPlayerList from './LobbyPlayerList';

function getPlayerId(player) {
  return player?.playerId?._id?.toString?.() || player?.playerId?.toString?.() || '';
}

// Dot-separated info pill (same as create-room screen)
const InfoRow = ({ items }) => (
  <View style={styles.infoRow}>
    {items.map((item, i) => (
      <View key={i} style={styles.infoItem}>
        {i > 0 && <Text style={styles.infoDot}>·</Text>}
        <Text style={styles.infoText}>{item}</Text>
      </View>
    ))}
  </View>
);

export default function LobbyView({
  roomId,
  roomData,
  userId,
  currentUserName = '',
  onLeaveSuccess,
}) {
  const lastToggleRef = useRef(0);
  const READY_DEBOUNCE_MS = 500;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');

  const players        = roomData?.players || [];
  const requiredPlayers = roomData?.player_count || 4;
  const gameType       = roomData?.game_type || 'kaliteri';
  const deckCount      = roomData?.deck_count || 1;
  const adminId        = (roomData?.admin?._id || roomData?.admin)?.toString?.();
  const adminName      = roomData?.admin?.name || '';
  const isAdmin        = (userId && adminId === userId) || (!!currentUserName && adminName === currentUserName);

  const allReady = useMemo(() => {
    return players.length >= requiredPlayers && players.every((p) => !!p.ready);
  }, [players, requiredPlayers]);

  const me = useMemo(() => {
    return players.find((p) => {
      const pid = getPlayerId(p);
      if (userId && pid === userId) return true;
      if (!userId && currentUserName && p?.playerId?.name === currentUserName) return true;
      return false;
    });
  }, [players, userId, currentUserName]);

  const iAmReady = !!me?.ready;

  // ── computed info row ──────────────────────────────────────────────────────
  const gameInfo = useMemo(() => {
    const totalCards   = 52 * deckCount - ((52 * deckCount) % requiredPlayers);
    const cardsPerPlayer = totalCards / requiredPlayers;
    const items = [
      `${players.length}/${requiredPlayers} players`,
      `${deckCount} deck${deckCount !== 1 ? 's' : ''}`,
      `${cardsPerPlayer} cards/player`,
    ];
    return items;
  }, [players.length, requiredPlayers, deckCount]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const shareCode = async () => {
    const code = roomData?.code;
    if (!code) return;
    try {
      const { Share } = require('react-native');
      await Share.share({ message: `Join my 52 Patta room. Code: ${code}` });
    } catch { /* no-op */ }
  };

  const toggleReady = () => {
    const now = Date.now();
    if (now - lastToggleRef.current < READY_DEBOUNCE_MS) return;
    lastToggleRef.current = now;
    setPendingAction('ready');
    WsUserToggleReady();
    setTimeout(() => setPendingAction(''), READY_DEBOUNCE_MS);
  };

  const startGame = () => {
    setPendingAction('start');
    WsGameStart();
    setTimeout(() => setPendingAction(''), 250);
  };

  const leaveRoom = () => {
    setPendingAction('leave');
    WsUserLeaveRoom();
    setTimeout(() => { setPendingAction(''); onLeaveSuccess?.(); }, 250);
  };

  const kickPlayer = (playerId) => { if (playerId) WsAdminKickPlayer(playerId); };

  const saveConfig = (payload) => { WsAdminUpdateConfig(payload); setSettingsOpen(false); };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrap}>

      {/* ── Header card: game type name + start button + info row ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.gameTitle}>
            {gameType === 'judgement' ? 'Judgement' : 'Kaliteri'}
          </Text>
          {isAdmin ? (
            <Pressable
              style={[
                buttonStyles.base, buttonStyles.primary, buttonStyles.small,
                (!allReady || pendingAction === 'start') && buttonStyles.disabled,
              ]}
              disabled={!allReady || pendingAction === 'start'}
              onPress={startGame}
            >
              <Text style={[buttonStyles.primaryText, buttonStyles.smallText]}>Start</Text>
            </Pressable>
          ) : null}
        </View>
        <InfoRow items={gameInfo} />
      </View>

      {/* ── Code card: label + code inline with icons ── */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeValue}>{roomData?.code || '------'}</Text>
          <View style={styles.codeIcons}>
            <Pressable style={styles.iconBtn} onPress={shareCode}>
              <Text style={styles.iconText}>⬆</Text>
            </Pressable>
            {isAdmin ? (
              <Pressable
                style={[styles.iconBtn, settingsOpen && styles.iconBtnActive]}
                onPress={() => setSettingsOpen((v) => !v)}
              >
                <Text style={[styles.iconText, settingsOpen && styles.iconTextActive]}>⚙</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {settingsOpen ? (
          <>
            <View style={styles.divider} />
            <LobbyConfigEditor
              roomData={roomData}
              onSave={saveConfig}
              onCancel={() => setSettingsOpen(false)}
            />
          </>
        ) : null}
      </View>

      {/* ── Ready & Leave actions ── */}
      <View style={styles.actionsCard}>
        <Pressable
          style={[styles.leaveBtn, pendingAction === 'leave' && buttonStyles.disabled]}
          onPress={leaveRoom}
        >
          <Text style={styles.leaveBtnText}>Leave</Text>
        </Pressable>

        <Pressable
          style={[
            styles.readyBtn,
            iAmReady ? styles.readyBtnActive : styles.readyBtnIdle,
            pendingAction === 'ready' && buttonStyles.disabled,
          ]}
          onPress={toggleReady}
        >
          <Text style={[styles.readyBtnText, iAmReady && styles.readyBtnTextActive]}>
            {iAmReady ? 'Not Ready' : 'Ready'}
          </Text>
        </Pressable>
      </View>

      {/* ── Players ── */}
      <View style={styles.playersCard}>
        <Text style={styles.sectionTitle}>
          Players ({players.length}/{requiredPlayers})
        </Text>
        <LobbyPlayerList players={players} isAdmin={isAdmin} userId={userId} onKick={kickPlayer} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },

  // ── Header card ────────────────────────────────────────────────────────────
  headerCard: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(201,162,39,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // Info row (reused from create-room)
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: 'rgba(201,162,39,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.12)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoDot: {
    color: 'rgba(201,162,39,0.4)',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    letterSpacing: 0.3,
  },

  // ── Code card ──────────────────────────────────────────────────────────────
  codeCard: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  codeLabel: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
    letterSpacing: 1.8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    fontFamily: 'monospace',
    color: colors.cream,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
  },
  codeIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  iconText: {
    fontSize: 18,
    color: colors.gold,
  },
  iconTextActive: {
    color: colors.goldLight,
  },
  divider: {
    ...dividerStyle,
  },

  // ── Actions card (Ready + Leave) ───────────────────────────────────────────
  actionsCard: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  readyBtn: {
    ...buttonStyles.base,
    flex: 1,
    height: 46,
    paddingVertical: 0,
  },
  readyBtnIdle: {
    ...buttonStyles.ready,
  },
  readyBtnActive: {
    ...buttonStyles.readyActive,
  },
  readyBtnText: {
    ...buttonStyles.readyText,
  },
  readyBtnTextActive: {
    color: colors.readyLight,
  },
  leaveBtn: {
    ...buttonStyles.base,
    flex: 1,
    height: 46,
    paddingVertical: 0,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  leaveBtnText: {
    ...buttonStyles.dangerText,
    color: colors.redSuit,
  },

  // ── Players card ──────────────────────────────────────────────────────────
  playersCard: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 13,
  },
});
