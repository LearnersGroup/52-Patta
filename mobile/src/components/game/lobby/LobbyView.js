import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
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
  pillStyle,
  shadows,
  spacing,
  typography,
} from '../../../styles/theme';
import LobbyChat from './LobbyChat';
import LobbyConfigEditor from './LobbyConfigEditor';
import LobbyPlayerList from './LobbyPlayerList';

function getPlayerId(player) {
  return player?.playerId?._id?.toString?.() || player?.playerId?.toString?.() || '';
}

export default function LobbyView({
  roomId,
  roomData,
  userId,
  currentUserName = '',
  chatMessages = [],
  onLeaveSuccess,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState('');

  const players = roomData?.players || [];
  const requiredPlayers = roomData?.player_count || 4;
  const gameType = roomData?.game_type || 'kaliteri';
  const adminId = (roomData?.admin?._id || roomData?.admin)?.toString?.();
  const adminName = roomData?.admin?.name || '';
  const isAdmin = (userId && adminId === userId) || (!!currentUserName && adminName === currentUserName);

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

  const shareCode = async () => {
    const code = roomData?.code;
    if (!code) return;
    try {
      await Share.share({
        message: `Join my 52 Patta room. Code: ${code}`,
      });
    } catch {
      // no-op
    }
  };

  const toggleReady = () => {
    setPendingAction('ready');
    WsUserToggleReady();
    setTimeout(() => setPendingAction(''), 250);
  };

  const startGame = () => {
    setPendingAction('start');
    WsGameStart();
    setTimeout(() => setPendingAction(''), 250);
  };

  const leaveRoom = () => {
    setPendingAction('leave');
    WsUserLeaveRoom();
    setTimeout(() => {
      setPendingAction('');
      onLeaveSuccess?.();
    }, 250);
  };

  const kickPlayer = (playerId) => {
    if (!playerId) return;
    WsAdminKickPlayer(playerId);
  };

  const saveConfig = (payload) => {
    WsAdminUpdateConfig(payload);
    setSettingsOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerCard}>
        <View style={styles.headerInfo}>
          <Text style={styles.roomLabel}>Game Room</Text>
          <Text style={styles.roomId}>{roomId}</Text>
          <View style={styles.gameTypePill}>
            <Text style={styles.gameTypeText}>{gameType === 'judgement' ? 'Judgement' : 'Kaliteri'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {isAdmin ? (
            <Pressable
              style={[buttonStyles.base, buttonStyles.primary, buttonStyles.small, (!allReady || pendingAction === 'start') && buttonStyles.disabled]}
              disabled={!allReady || pendingAction === 'start'}
              onPress={startGame}
            >
              <Text style={[buttonStyles.primaryText, buttonStyles.smallText]}>Start</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[buttonStyles.base, iAmReady ? buttonStyles.readyActive : buttonStyles.ready, buttonStyles.small, pendingAction === 'ready' && buttonStyles.disabled]}
            onPress={toggleReady}
          >
            <Text style={[buttonStyles.readyText, buttonStyles.smallText]}>{iAmReady ? 'Not Ready' : 'Ready'}</Text>
          </Pressable>

          <Pressable
            style={[buttonStyles.base, buttonStyles.danger, buttonStyles.small, pendingAction === 'leave' && buttonStyles.disabled]}
            onPress={leaveRoom}
          >
            <Text style={[buttonStyles.dangerText, buttonStyles.smallText]}>Leave</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Room Code</Text>
        <Text style={styles.codeValue}>{roomData?.code || '------'}</Text>
        <View style={styles.codeActions}>
          <Pressable style={[buttonStyles.base, buttonStyles.secondary, buttonStyles.small]} onPress={shareCode}>
            <Text style={[buttonStyles.secondaryText, buttonStyles.smallText]}>Share</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable style={[buttonStyles.base, buttonStyles.outline, buttonStyles.small]} onPress={() => setSettingsOpen((v) => !v)}>
              <Text style={[buttonStyles.outlineText, buttonStyles.smallText]}>{settingsOpen ? 'Close' : 'Settings'}</Text>
            </Pressable>
          ) : null}
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

      <View style={styles.playersCard}>
        <Text style={styles.sectionTitle}>
          Players ({players.length}/{requiredPlayers})
        </Text>
        <LobbyPlayerList players={players} isAdmin={isAdmin} userId={userId} onKick={kickPlayer} />
      </View>

      <View style={styles.chatCard}>
        <LobbyChat messages={chatMessages} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  // Header card
  headerCard: {
    ...panelStyle,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  roomLabel: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
    letterSpacing: 1.8,
  },
  roomId: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontSize: 16,
    fontWeight: '700',
  },
  gameTypePill: {
    ...pillStyle,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  gameTypeText: {
    ...typography.captionSmall,
    fontFamily: fonts.body,
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  // Code card
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
  codeValue: {
    ...typography.mono,
    fontFamily: 'monospace',
    color: colors.cream,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
  },
  codeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  divider: {
    ...dividerStyle,
  },
  // Players card
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
  // Chat card
  chatCard: {
    ...panelStyle,
    padding: spacing.md,
  },
});
