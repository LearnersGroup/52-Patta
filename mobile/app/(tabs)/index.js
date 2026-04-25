import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const GAME_ICONS = {
  kaliteri:  require('../../assets/Icons/Kaliteri_Icon.png'),
  judgement: require('../../assets/Icons/Judgement_Icon.png'),
  mendikot:  require('../../assets/Icons/Mendi_Icon.png'),
};
import { socket } from '../../src/api/socket';
import { get_current_game } from '../../src/api/apiHandler';
import { useAuth } from '../../src/hooks/useAuth';
import AppBackground from '../../src/components/shared/AppBackground';
import AvatarImage from '../../src/components/shared/AvatarImage';
import {
  buttonStyles,
  colors,
  fonts,
  inputStyle,
  panelStyle,
  spacing,
  typography,
} from '../../src/styles/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthResolved, user, profile } = useAuth();
  const autoNavLockRef = useRef(false);
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [rejoinInfo, setRejoinInfo] = useState(null);
  const [joiningKey, setJoiningKey] = useState('');
  const [error, setError] = useState('');

  const navigateToRoom = useCallback((roomId) => {
    if (!roomId || autoNavLockRef.current) return;
    autoNavLockRef.current = true;
    router.replace({ pathname: '/game-room/[id]', params: { id: String(roomId) } });
  }, [router]);

  useEffect(() => {
    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onRejoin     = (data) => {
      if (!data) return;
      if (data.roomId && data.gamePhase && data.gamePhase !== 'lobby') {
        navigateToRoom(data.roomId);
      } else if (data.roomId || data.code) {
        setRejoinInfo(data);
      }
    };
    const onRedirect   = (roomId, callback) => {
      setJoiningKey('');
      navigateToRoom(roomId);
      if (typeof callback === 'function') callback({ status: 200 });
    };

    socket.on('connect',              onConnect);
    socket.on('disconnect',           onDisconnect);
    socket.on('rejoin-available',     onRejoin);
    socket.on('redirect-to-game-room', onRedirect);

    const checkCurrentRoom = async () => {
      if (!isAuthResolved || !user?.token || autoNavLockRef.current) return;
      try {
        const game = await get_current_game();
        if (game?._id && game.state && game.state !== 'lobby') {
          navigateToRoom(game._id);
        } else if (game?._id) {
          setRejoinInfo({ roomId: game._id, roomname: game.roomname, code: game.code, gamePhase: 'lobby' });
        }
      } catch {
        // ignore fallback errors; socket path still handles rejoin
      }
    };

    if (user?.token && socket.connected) {
      socket.disconnect();
      socket.connect();
    } else if (user?.token && !socket.connected) {
      socket.connect();
    }

    checkCurrentRoom();

    return () => {
      socket.off('connect',              onConnect);
      socket.off('disconnect',           onDisconnect);
      socket.off('rejoin-available',     onRejoin);
      socket.off('redirect-to-game-room', onRedirect);
    };
  }, [router, navigateToRoom, isAuthResolved, user?.token]);

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
    if (rejoinInfo.roomId) navigateToRoom(rejoinInfo.roomId);
  };

  if (!isAuthResolved) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }
  if (!user)                                         return <Redirect href="/login" />;
  if (user?.needs_onboarding || !user?.user_name)   return <Redirect href="/create-user" />;

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
              ? <AvatarImage uri={avatarUri} width="100%" height="100%" />
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

      {/* ── Games ── */}
      <Text style={styles.gamesTitle}>Games</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gamesRow}
        style={styles.gamesScroll}
      >
        <Pressable style={styles.gameCard} onPress={() => router.push('/rules/kaliteri')}>
          <Image source={GAME_ICONS.kaliteri} style={styles.gameCardImg} />
          <Text style={styles.gameCardName}>Kaliteri</Text>
        </Pressable>

        <Pressable style={styles.gameCard} onPress={() => router.push('/rules/judgement')}>
          <Image source={GAME_ICONS.judgement} style={styles.gameCardImg} />
          <Text style={styles.gameCardName}>Judgement</Text>
        </Pressable>

        <Pressable style={styles.gameCard} onPress={() => router.push('/rules/mendikot')}>
          <Image source={GAME_ICONS.mendikot} style={styles.gameCardImg} />
          <Text style={styles.gameCardName}>Mendikot</Text>
        </Pressable>
      </ScrollView>

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

  gamesTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginTop: spacing.xs,
  },
  gamesScroll: {
    flexGrow: 0,
  },
  gamesRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  gameCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  gameCardImg: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  gameCardName: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 1,
  },
});
