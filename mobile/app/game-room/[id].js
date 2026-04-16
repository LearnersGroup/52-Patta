import { Redirect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { resetGame, setPlayerAvatars } from '../../src/redux/slices/game';
import { notify } from '../../src/redux/slices/alert';
import { WsQuitGame, WsRequestGameState, WsUserLeaveRoom } from '../../src/api/wsEmitters';
import { registerGameListeners } from '../../src/api/wsGameListeners';
import { socket } from '../../src/api/socket';
import { get_all_user_in_room } from '../../src/api/apiHandler';
import GameBoard from '../../src/components/game/board/GameBoard';
import LobbyView from '../../src/components/game/lobby/LobbyView';
import { useAuth } from '../../src/hooks/useAuth';
import useAppState from '../../src/hooks/useAppState';
import AppBackground from '../../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  spacing,
} from '../../src/styles/theme';

export default function GameRoomScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { id }     = useLocalSearchParams();
  const { user }   = useAuth();
  const phase      = useSelector((state) => state.game.phase);

  const [roomData,          setRoomData]          = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [initialLoaded,     setInitialLoaded]     = useState(false);
  const [error,             setError]             = useState('');
  const [stateRequested,    setStateRequested]    = useState(false);
  const [showLeaveConfirm,  setShowLeaveConfirm]  = useState(false);

  // When true, allow navigation to proceed (bypass beforeRemove guard)
  const leavingRef = useRef(false);

  // ── Re-sync state when returning from background (screen unlock) ───────
  useAppState({
    onForeground: async () => {
      const isGameActive = phase !== null && phase !== 'lobby';
      if (isGameActive) {
        // Re-request authoritative game state from server
        WsRequestGameState();
      } else {
        // Lobby — re-fetch room data; if player was removed, go home
        try {
          const room = await get_all_user_in_room(id);
          setRoomData(room);
        } catch {
          dispatch(notify('You were removed from the room.', 'warning', 4000));
          leavingRef.current = true;
          dispatch(resetGame());
          router.replace('/');
        }
      }
    },
  });

  const deriveUserIdFromRoom = (room) => {
    if (!room?.players?.length || !user?.user_name) return '';
    const me = room.players.find((p) => p?.playerId?.name === user.user_name);
    return me?.playerId?._id?.toString?.() || '';
  };

  const userId  = deriveUserIdFromRoom(roomData);
  const adminId = (roomData?.admin?._id || roomData?.admin)?.toString?.() || '';
  const isAdmin = !!userId && userId === adminId;

  // ── Intercept ALL back navigation (swipe, hardware back, header back) ────
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Allow if we've explicitly confirmed leaving
      if (leavingRef.current) return;

      // Block and show the confirmation dialog
      e.preventDefault();
      setShowLeaveConfirm(true);
    });
    return unsubscribe;
  }, [navigation]);

  // ── Confirm leave handler ────────────────────────────────────────────────
  const handleConfirmLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    leavingRef.current = true;

    const isGameActive = phase !== null && phase !== 'lobby';
    if (isGameActive) {
      // Admin quitting ends the game for everyone; non-admin just forfeits
      if (isAdmin) {
        WsQuitGame();
      }
      dispatch(resetGame());
    } else {
      // Lobby — tell the server so the player slot is freed
      WsUserLeaveRoom();
    }

    router.dismissAll();
  }, [phase, isAdmin, dispatch, router]);

  useEffect(() => {
    let mounted = true;

    const fetchRoom = async () => {
      if (!id || typeof id !== 'string') {
        if (mounted) { setLoading(false); setError('Invalid room id'); }
        return;
      }
      try {
        if (!initialLoaded) setLoading(true);
        const room = await get_all_user_in_room(id);
        if (!mounted) return;
        setRoomData(room);
        setInitialLoaded(true);
        setError('');
        // If the room is in lobby state, clear any stale Redux game phase left
        // over from a previous session — otherwise isGameActive stays true and
        // the GameBoard renders instead of the lobby UI.
        if (room?.state === 'lobby') {
          dispatch(resetGame());
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.errors?.[0]?.msg || 'Failed to load room');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRoom();

    const onFetchUsers   = () => fetchRoom();
    const onRedirectHome = () => {
      // Server told us to go home (e.g. admin closed the room, or kicked)
      dispatch(notify('The room was closed by the host.', 'warning', 4000));
      leavingRef.current = true;
      dispatch(resetGame());
      router.replace('/');
    };

    socket.on('fetch-users-in-room',   onFetchUsers);
    socket.on('redirect-to-home-page', onRedirectHome);

    return () => {
      mounted = false;
      socket.off('fetch-users-in-room',   onFetchUsers);
      socket.off('redirect-to-home-page', onRedirectHome);
    };
  }, [id, router, initialLoaded, dispatch]);

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

  const handleBack = () => setShowLeaveConfirm(true);

  // ── Leave confirmation modal ───────────────────────────────────────────
  const leaveModal = (
    <Modal
      visible={showLeaveConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLeaveConfirm(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {isGameActive ? 'Leave game?' : 'Leave room?'}
          </Text>
          <Text style={styles.modalBody}>
            {isGameActive
              ? (isAdmin
                  ? 'This will end the active game for everyone in the room.'
                  : 'You will leave the current game. You may not be able to rejoin.')
              : 'You will leave this room and return to the home screen.'}
          </Text>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalBtnGhost} onPress={() => setShowLeaveConfirm(false)}>
              <Text style={styles.modalGhostText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalBtnDanger} onPress={handleConfirmLeave}>
              <Text style={styles.modalDangerText}>Leave</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

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
        {leaveModal}
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
            onLeaveSuccess={() => {
              leavingRef.current = true;
              router.replace('/');
            }}
          />
        )}
      </ScrollView>
      {leaveModal}
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

  // ── Leave confirmation modal ──────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...panelStyle,
    width: '100%',
    maxWidth: 340,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.cream,
    letterSpacing: 1,
  },
  modalBody: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modalGhostText: {
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  modalBtnDanger: {
    borderWidth: 1,
    borderColor: colors.redSuit,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  modalDangerText: {
    color: colors.redSuit,
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
});
