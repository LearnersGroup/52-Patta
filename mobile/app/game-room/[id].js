import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setPlayerAvatars } from '../../src/redux/slices/game';
import { WsRequestGameState } from '../../src/api/wsEmitters';
import { registerGameListeners } from '../../src/api/wsGameListeners';
import { socket } from '../../src/api/socket';
import { get_all_user_in_room } from '../../src/api/apiHandler';
import GameBoard from '../../src/components/game/board/GameBoard';
import LobbyView from '../../src/components/game/lobby/LobbyView';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, spacing, typography } from '../../src/styles/theme';

export default function GameRoomScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const phase = useSelector((state) => state.game.phase);

  const [roomData, setRoomData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stateRequested, setStateRequested] = useState(false);

  const deriveUserIdFromRoom = (room) => {
    if (!room?.players?.length || !user?.user_name) return '';
    const me = room.players.find((p) => p?.playerId?.name === user.user_name);
    return me?.playerId?._id?.toString?.() || '';
  };

  const userId = deriveUserIdFromRoom(roomData);
  const adminId = (roomData?.admin?._id || roomData?.admin)?.toString?.() || '';
  const isAdmin = !!userId && userId === adminId;

  useEffect(() => {
    let mounted = true;

    const fetchRoom = async () => {
      if (!id || typeof id !== 'string') {
        if (mounted) {
          setLoading(false);
          setError('Invalid room id');
        }
        return;
      }

      try {
        setLoading(true);
        const room = await get_all_user_in_room(id);
        if (!mounted) return;
        setRoomData(room);
        setChatMessages(Array.isArray(room?.messages) ? room.messages : []);
        setError('');
      } catch (e) {
        if (!mounted) return;
        setError(e?.errors?.[0]?.msg || 'Failed to load room');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRoom();

    const onFetchUsersInRoom = () => {
      fetchRoom();
    };
    const onRoomMessage = (message) => {
      if (!message) return;
      setChatMessages((prev) => [...prev, String(message)]);
    };
    const onRedirectToHome = () => {
      router.replace('/');
    };

    socket.on('fetch-users-in-room', onFetchUsersInRoom);
    socket.on('room-message', onRoomMessage);
    socket.on('redirect-to-home-page', onRedirectToHome);

    return () => {
      mounted = false;
      socket.off('fetch-users-in-room', onFetchUsersInRoom);
      socket.off('room-message', onRoomMessage);
      socket.off('redirect-to-home-page', onRedirectToHome);
    };
  }, [id, router]);

  useEffect(() => {
    const cleanupGameListeners = registerGameListeners();

    const requestState = () => {
      WsRequestGameState();
      setStateRequested(true);
    };

    const onSocketConnect = () => {
      requestState();
    };
    const onGameAvatars = (avatars) => {
      dispatch(setPlayerAvatars(avatars && typeof avatars === 'object' ? avatars : {}));
    };

    socket.on('connect', onSocketConnect);
    socket.on('game-avatars', onGameAvatars);
    if (socket.connected) {
      requestState();
    }

    return () => {
      socket.off('connect', onSocketConnect);
      socket.off('game-avatars', onGameAvatars);
      cleanupGameListeners();
    };
  }, [dispatch]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user?.needs_onboarding) {
    return <Redirect href="/create-user" />;
  }

  const isGameActive = phase !== null && phase !== 'lobby';

  if (!isGameActive) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Game Room</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.goldLight} />
            <Text style={styles.text}>Loading room...</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <LobbyView
            roomId={String(id || '')}
            roomData={roomData}
            userId={userId}
            currentUserName={user?.user_name || ''}
            chatMessages={chatMessages}
            onLeaveSuccess={() => router.replace('/')}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Game Room</Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.goldLight} />
          <Text style={styles.text}>Loading room...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {!stateRequested ? (
            <View style={styles.infoCard}>
              <Text style={styles.note}>Syncing game state...</Text>
            </View>
          ) : null}

          <GameBoard userId={userId} isAdmin={isAdmin} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgDeep,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    ...typography.heading,
    color: colors.cream,
  },
  text: {
    ...typography.body,
    color: colors.creamMuted,
  },
  note: {
    color: colors.goldLight,
    marginTop: spacing.sm,
    fontSize: typography.caption.fontSize,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 12,
    backgroundColor: colors.bgPanel,
    padding: spacing.md,
    gap: spacing.xs,
  },
  loadingWrap: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  error: {
    color: colors.redSuit,
  },
});
