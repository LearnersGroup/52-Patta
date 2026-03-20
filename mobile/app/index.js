import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { socket } from '../src/api/socket';
import { useAuth } from '../src/hooks/useAuth';
import AppBackground from '../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  inputStyle,
  panelStyle,
  spacing,
  typography,
} from '../src/styles/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthResolved, user, profile } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [rejoinInfo, setRejoinInfo] = useState(null);
  const [joiningKey, setJoiningKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onRejoin     = (data) => setRejoinInfo(data || null);
    const onRedirect   = (roomId, callback) => {
      setJoiningKey('');
      router.push(`/game-room/${roomId}`);
      if (typeof callback === 'function') callback({ status: 200 });
    };

    socket.on('connect',              onConnect);
    socket.on('disconnect',           onDisconnect);
    socket.on('rejoin-available',     onRejoin);
    socket.on('redirect-to-game-room', onRedirect);

    return () => {
      socket.off('connect',              onConnect);
      socket.off('disconnect',           onDisconnect);
      socket.off('rejoin-available',     onRejoin);
      socket.off('redirect-to-game-room', onRedirect);
    };
  }, [router]);

  const joinRoom = useCallback((payload, key) => {
    setError('');
    setJoiningKey(key);
    socket.emit('user-join-room', payload, (err) => {
      if (err) { setError(String(err)); setJoiningKey(''); }
    });
  }, []);

  const onJoinByCode = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) { setError('Enter a room code first'); return; }
    joinRoom({ code }, `code:${code}`);
  };

  const onRejoin = () => {
    if (!rejoinInfo) return;
    if (rejoinInfo.code) { joinRoom({ code: rejoinInfo.code }, `rejoin:${rejoinInfo.code}`); return; }
    if (rejoinInfo.roomId) router.push(`/game-room/${rejoinInfo.roomId}`);
  };

  if (!isAuthResolved) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }
  if (!user)                  return <Redirect href="/login" />;
  if (user?.needs_onboarding) return <Redirect href="/create-user" />;

  const avatarUri  = profile?.avatar || null;
  const playerName = user?.user_name || 'Player';

  return (
    <AppBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Navbar ── */}
      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          <Text style={styles.appTitle}>52 Patta</Text>
          <View style={[styles.connDot, isConnected ? styles.connOn : styles.connOff]} />
        </View>

        {/* Player name + avatar → taps to profile */}
        <Pressable style={styles.playerBadge} onPress={() => router.push('/profile')}>
          <Text style={styles.playerName}>{playerName}</Text>
          <View style={styles.avatarCircle}>
            {avatarUri
              ? <SvgUri uri={avatarUri} width="100%" height="100%" />
              : <Text style={styles.avatarInitial}>{playerName[0]?.toUpperCase()}</Text>}
          </View>
        </Pressable>
      </View>

      {/* ── Rejoin banner ── */}
      {rejoinInfo ? (
        <Pressable style={styles.rejoinBanner} onPress={onRejoin}>
          <Text style={styles.rejoinTitle}>Active game found</Text>
          <Text style={styles.rejoinSub}>
            Rejoin {rejoinInfo.roomname || 'your game'} ({rejoinInfo.code || '—'})
          </Text>
        </Pressable>
      ) : null}

      {/* ── Join by code ── */}
      <View style={styles.joinPanel}>
        <Text style={styles.panelTitle}>Join by Room Code</Text>
        <View style={styles.joinRow}>
          <TextInput
            value={roomCode}
            onChangeText={(v) => setRoomCode(v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            placeholder="ABC123"
            placeholderTextColor={colors.creamMuted}
            style={styles.codeInput}
          />
          <TouchableOpacity
            style={[buttonStyles.base, buttonStyles.primary, !roomCode.trim() && buttonStyles.disabled]}
            onPress={onJoinByCode}
            disabled={!roomCode.trim() || joiningKey.startsWith('code:')}
          >
            <Text style={buttonStyles.primaryText}>
              {joiningKey.startsWith('code:') ? 'Joining…' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Create room ── */}
      <TouchableOpacity
        style={[buttonStyles.base, buttonStyles.secondary, buttonStyles.full, styles.createRoomBtn]}
        onPress={() => router.push('/game-room/new')}
      >
        <Text style={buttonStyles.secondaryText}>+ Create Room</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

    </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: typography.body.fontSize,
  },

  // Navbar — lifted card so it doesn't bleed into the textured background
  navbar: {
    ...panelStyle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.gold,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(201, 162, 39, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connOn: {
    backgroundColor: colors.ready,
    shadowColor: colors.ready,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  connOff: {
    backgroundColor: colors.redSuit,
    shadowColor: colors.redSuit,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },

  // Player badge (name + avatar)
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerName: {
    fontFamily: fonts.bodyBold,
    color: colors.cream,
    fontSize: 16,
    maxWidth: 120,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
    borderWidth: 2,
    borderColor: colors.borderGoldBright,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.gold,
  },

  // Rejoin banner
  rejoinBanner: {
    ...panelStyle,
    borderColor: colors.readyBorder,
    backgroundColor: colors.readyBg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rejoinTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },
  rejoinSub: {
    fontFamily: fonts.body,
    color: colors.cream,
    fontSize: 14,
  },

  // Join panel
  joinPanel: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  joinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
    ...inputStyle,
    letterSpacing: 3,
    fontFamily: fonts.body,
    textAlign: 'center',
  },

  // Create Room — dark/black bg to contrast the green panels, still blocks bg lines
  createRoomBtn: {
    backgroundColor: colors.bgInput,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },

  error: {
    fontFamily: fonts.body,
    color: colors.redSuit,
    fontSize: 13,
  },
});
