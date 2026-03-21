import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setPlayerAvatars } from '../../src/redux/slices/game';
import { WsRequestGameState, WsUserLeaveRoom } from '../../src/api/wsEmitters';
import { registerGameListeners } from '../../src/api/wsGameListeners';
import { socket } from '../../src/api/socket';
import { get_all_user_in_room } from '../../src/api/apiHandler';
import GameBoard from '../../src/components/game/board/GameBoard';
import LobbyView from '../../src/components/game/lobby/LobbyView';
import { useAuth } from '../../src/hooks/useAuth';
import AppBackground from '../../src/components/shared/AppBackground';
import {
  colors,
  fonts,
  spacing,
} from '../../src/styles/theme';

export default function GameRoomScreen() {
  const router   = useRouter();
  const dispatch = useDispatch();
  const { id }   = useLocalSearchParams();
  const { user } = useAuth();
  const phase    = useSelector((state) => state.game.phase);

  const [roomData,        setRoomData]        = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [initialLoaded,   setInitialLoaded]   = useState(false);
  const [error,           setError]           = useState('');
  const [stateRequested,  setStateRequested]  = useState(false);

  const deriveUserIdFromRoom = (room) => {
    if (!room?.players?.length || !user?.user_name) return '';
    const me = room.players.find((p) => p?.playerId?.name === user.user_name);
    return me?.playerId?._id?.toString?.() || '';
  };

  const userId  = deriveUserIdFromRoom(roomData);
  const adminId = (roomData?.admin?._id || roomData?.admin)?.toString?.() || '';
  const isAdmin = !!userId && userId === adminId;

  useEffect(() => {
    let mounted = true;

    const fetchRoom = async () => {
      if (!id || typeof id !== 'string') {
        if (mounted) { setLoading(false); setError('Invalid room id'); }
        return;
      }
      try {
        // Only show the loading spinner on the very first fetch.
        // Subsequent socket-triggered refreshes (e.g. ready toggle) update silently
        // to avoid the brief black-screen flash.
        if (!initialLoaded) setLoading(true);
        const room = await get_all_user_in_room(id);
        if (!mounted) return;
        setRoomData(room);
        setInitialLoaded(true);
        setError('');
      } catch (e) {
        if (!mounted) return;
        setError(e?.errors?.[0]?.msg || 'Failed to load room');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRoom();

    const onFetchUsers   = () => fetchRoom();
    const onRedirectHome = () => router.replace('/');

    socket.on('fetch-users-in-room',   onFetchUsers);
    socket.on('redirect-to-home-page', onRedirectHome);

    return () => {
      mounted = false;
      socket.off('fetch-users-in-room',   onFetchUsers);
      socket.off('redirect-to-home-page', onRedirectHome);
    };
  }, [id, router, initialLoaded]);

  useEffect(() => {
    const cleanup = registerGameListeners();

    const onConnect    = () => { WsRequestGameState(); setStateRequested(true); };
    const onGameAvatars = (avatars) => {
      dispatch(setPlayerAvatars(avatars && typeof avatars === 'object' ? avatars : {}));
    };

    socket.on('connect',      onConnect);
    socket.on('game-avatars', onGameAvatars);
    if (socket.connected) { WsRequestGameState(); setStateRequested(true); }

    return () => {
      socket.off('connect',      onConnect);
      socket.off('game-avatars', onGameAvatars);
      cleanup();
    };
  }, [dispatch]);

  if (!user)                  return <Redirect href="/login" />;
  if (user?.needs_onboarding) return <Redirect href="/create-user" />;

  const isGameActive = phase !== null && phase !== 'lobby';
  const roomTitle    = roomData?.roomname || 'Game Room';

  const handleBack = () => {
    if (!isGameActive) {
      // Properly leave the lobby server-side so the player slot is freed
      WsUserLeaveRoom();
    }
    router.dismissAll();
  };

  // ── Active game — full-screen, no chrome, hand fixed at bottom ──────────
  if (isGameActive) {
    return (
      <AppBackground>
        <View style={styles.gameScreen}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.goldLight} />
              <Text style={styles.loadingText}>Loading room...</Text>
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <>
              {!stateRequested ? (
                <View style={styles.syncCard}>
                  <Text style={styles.syncText}>Syncing game state...</Text>
                </View>
              ) : null}
              <GameBoard userId={userId} isAdmin={isAdmin} />
            </>
          )}
        </View>
      </AppBackground>
    );
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  return (
    <AppBackground>
      {/* Header — consistent with profile / create-room */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{roomTitle}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.goldLight} />
            <Text style={styles.loadingText}>Loading room...</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <LobbyView
            roomId={String(id || '')}
            roomData={roomData}
            userId={userId}
            currentUserName={user?.user_name || ''}
            onLeaveSuccess={() => router.replace('/')}
          />
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // Header — matches profile / avatar-editor / create-room
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.gold,
    lineHeight: 28,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(201,162,39,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Active game — full-screen flex container (no scroll)
  gameScreen: {
    flex: 1,
    padding: spacing.sm,
  },

  // Lobby content
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  loadingWrap: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 14,
  },
  syncCard: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 12,
    backgroundColor: colors.bgPanel,
    padding: spacing.md,
  },
  syncText: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 13,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.redSuit,
    fontSize: 13,
  },
});
