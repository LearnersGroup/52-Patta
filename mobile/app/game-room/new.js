import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { socket } from '../../src/api/socket';
import { useAuth } from '../../src/hooks/useAuth';
import { colors, spacing, typography } from '../../src/styles/theme';

const isDeckCountValid = (playerCount, deckCount) => {
  const removeTwos = (52 * deckCount) % playerCount;
  return removeTwos <= 4 * deckCount;
};

const NumberStepper = ({ label, value, min, max, step = 1, onChange, suffix = '' }) => {
  const onDec = () => onChange(Math.max(min, value - step));
  const onInc = () => onChange(Math.min(max, value + step));

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperBtn} onPress={onDec} disabled={value <= min}>
          <Text style={styles.stepperBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>
          {value}
          {suffix}
        </Text>
        <Pressable style={styles.stepperBtn} onPress={onInc} disabled={value >= max}>
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function NewGameRoomScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const defaultRoomName = `${user?.user_name || 'Player'}'s Room`;

  const [roomName, setRoomName] = useState(defaultRoomName);
  const [gameType, setGameType] = useState('kaliteri');
  const [playerCount, setPlayerCount] = useState(4);
  const [deckCount, setDeckCount] = useState(1);

  // Kaliteri config
  const [bidThreshold, setBidThreshold] = useState(200);
  const [gameCount, setGameCount] = useState(4);
  const [bidWindow, setBidWindow] = useState(15);
  const [inspectTime, setInspectTime] = useState(15);

  // Judgement config
  const [maxCardsPerRound, setMaxCardsPerRound] = useState(7);
  const [reverseOrder, setReverseOrder] = useState(true);
  const [trumpMode, setTrumpMode] = useState('fixed');
  const [scoreboardTime, setScoreboardTime] = useState(5);
  const [bidTimeEnabled, setBidTimeEnabled] = useState(false);
  const [bidTime, setBidTime] = useState(15);
  const [cardRevealTime, setCardRevealTime] = useState(10);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const minPlayers = gameType === 'judgement' ? 3 : 4;
  const isOddPlayers = playerCount % 2 === 1;
  const maxPossibleCards = useMemo(
    () => Math.max(1, Math.floor((52 * deckCount) / playerCount)),
    [deckCount, playerCount]
  );

  useEffect(() => {
    const onRedirectToGameRoom = (roomId, callback) => {
      setCreating(false);
      router.replace(`/game-room/${roomId}`);
      if (typeof callback === 'function') callback({ status: 200 });
    };

    socket.on('redirect-to-game-room', onRedirectToGameRoom);
    return () => socket.off('redirect-to-game-room', onRedirectToGameRoom);
  }, [router]);

  useEffect(() => {
    setPlayerCount((prev) => Math.max(minPlayers, prev));
  }, [minPlayers]);

  useEffect(() => {
    if (gameType === 'judgement') {
      setDeckCount(playerCount <= 6 ? 1 : 2);
      return;
    }

    if (!isDeckCountValid(playerCount, deckCount)) {
      setDeckCount(2);
    }
  }, [deckCount, gameType, playerCount]);

  useEffect(() => {
    setMaxCardsPerRound((prev) => Math.max(1, Math.min(prev, maxPossibleCards)));
  }, [maxPossibleCards]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user?.needs_onboarding) {
    return <Redirect href="/create-user" />;
  }

  const toggleGameType = (value) => {
    setGameType(value);
    if (value === 'judgement' && playerCount < 3) {
      setPlayerCount(3);
    }
    if (value === 'kaliteri' && playerCount < 4) {
      setPlayerCount(4);
    }
  };

  const onCreateRoom = () => {
    const trimmedRoomName = roomName.trim() || defaultRoomName;
    if (!trimmedRoomName) {
      setError('Room name is required');
      return;
    }

    const payload = {
      roomname: trimmedRoomName,
      player_count: playerCount,
      game_type: gameType,
      deck_count: deckCount,
    };

    if (gameType === 'kaliteri') {
      payload.game_count = gameCount;
      payload.bid_window = bidWindow;
      payload.inspect_time = inspectTime;
      if (isOddPlayers) {
        payload.bid_threshold = bidThreshold;
      }
    } else {
      payload.max_cards_per_round = maxCardsPerRound;
      payload.reverse_order = reverseOrder;
      payload.trump_mode = trumpMode;
      payload.scoreboard_time = scoreboardTime;
      payload.card_reveal_time = cardRevealTime;
      if (bidTimeEnabled) {
        payload.judgement_bid_time = bidTime;
      }
    }

    setError('');
    setCreating(true);
    socket.emit('user-create-room', payload, (err) => {
      if (err) {
        setCreating(false);
        setError(String(err));
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create Game Room</Text>
      <Text style={styles.text}>Set up room rules before inviting players.</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Room Name</Text>
        <TextInput
          value={roomName}
          onChangeText={setRoomName}
          placeholder={defaultRoomName}
          placeholderTextColor={colors.creamMuted}
          style={styles.input}
          maxLength={50}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Game Type</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.chip, gameType === 'kaliteri' && styles.chipActive]}
            onPress={() => toggleGameType('kaliteri')}
          >
            <Text style={styles.chipText}>Kaliteri</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, gameType === 'judgement' && styles.chipActive]}
            onPress={() => toggleGameType('judgement')}
          >
            <Text style={styles.chipText}>Judgement</Text>
          </Pressable>
        </View>
      </View>

      <NumberStepper
        label="Players"
        value={playerCount}
        min={minPlayers}
        max={13}
        onChange={setPlayerCount}
      />

      <View style={styles.formGroup}>
        <Text style={styles.label}>Decks</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.chip, deckCount === 1 && styles.chipActive]}
            onPress={() => setDeckCount(1)}
            disabled={gameType === 'judgement' ? playerCount >= 7 : !isDeckCountValid(playerCount, 1)}
          >
            <Text style={styles.chipText}>1 Deck</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, deckCount === 2 && styles.chipActive]}
            onPress={() => setDeckCount(2)}
            disabled={gameType === 'judgement' && playerCount <= 6}
          >
            <Text style={styles.chipText}>2 Decks</Text>
          </Pressable>
        </View>
      </View>

      {gameType === 'kaliteri' ? (
        <>
          {isOddPlayers ? (
            <NumberStepper
              label="Bid Threshold"
              value={bidThreshold}
              min={155}
              max={500}
              step={5}
              onChange={setBidThreshold}
            />
          ) : null}
          <NumberStepper
            label="Number of Games"
            value={gameCount}
            min={1}
            max={20}
            onChange={setGameCount}
          />
          <NumberStepper
            label="Bidding Window"
            value={bidWindow}
            min={5}
            max={60}
            step={5}
            onChange={setBidWindow}
            suffix="s"
          />
          <NumberStepper
            label="Card Inspect Time"
            value={inspectTime}
            min={5}
            max={30}
            step={5}
            onChange={setInspectTime}
            suffix="s"
          />
        </>
      ) : (
        <>
          <NumberStepper
            label="Max Cards Per Round"
            value={maxCardsPerRound}
            min={1}
            max={maxPossibleCards}
            onChange={setMaxCardsPerRound}
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Round Order</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, !reverseOrder && styles.chipActive]}
                onPress={() => setReverseOrder(false)}
              >
                <Text style={styles.chipText}>Ascending</Text>
              </Pressable>
              <Pressable
                style={[styles.chip, reverseOrder && styles.chipActive]}
                onPress={() => setReverseOrder(true)}
              >
                <Text style={styles.chipText}>Up & Down</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Trump Mode</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, trumpMode === 'fixed' && styles.chipActive]}
                onPress={() => setTrumpMode('fixed')}
              >
                <Text style={styles.chipText}>Fixed</Text>
              </Pressable>
              <Pressable
                style={[styles.chip, trumpMode === 'random' && styles.chipActive]}
                onPress={() => setTrumpMode('random')}
              >
                <Text style={styles.chipText}>Random</Text>
              </Pressable>
            </View>
          </View>

          <NumberStepper
            label="Scoreboard Time"
            value={scoreboardTime}
            min={3}
            max={30}
            onChange={setScoreboardTime}
            suffix="s"
          />

          <View style={styles.formGroup}>
            <Text style={styles.label}>Judgement Bid Timer</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.chip, !bidTimeEnabled && styles.chipActive]}
                onPress={() => setBidTimeEnabled(false)}
              >
                <Text style={styles.chipText}>No Limit</Text>
              </Pressable>
              <Pressable
                style={[styles.chip, bidTimeEnabled && styles.chipActive]}
                onPress={() => setBidTimeEnabled(true)}
              >
                <Text style={styles.chipText}>Time Limit</Text>
              </Pressable>
            </View>
          </View>

          {bidTimeEnabled ? (
            <NumberStepper
              label="Bid Time"
              value={bidTime}
              min={5}
              max={60}
              step={5}
              onChange={setBidTime}
              suffix="s"
            />
          ) : null}

          <NumberStepper
            label="Card Reveal Time"
            value={cardRevealTime}
            min={3}
            max={30}
            onChange={setCardRevealTime}
            suffix="s"
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onCreateRoom} disabled={creating}>
          {creating ? (
            <ActivityIndicator color={colors.bgDeep} />
          ) : (
            <Text style={styles.buttonText}>Create Room</Text>
          )}
        </TouchableOpacity>
      </View>
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
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.gold,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.cream,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    opacity: 0.95,
  },
  chipActive: {
    borderColor: colors.borderGoldBright,
    backgroundColor: colors.greenGlow,
  },
  chipText: {
    color: colors.cream,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    width: 40,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: colors.goldLight,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
  stepperValue: {
    minWidth: 72,
    color: colors.cream,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  backButton: {
    backgroundColor: colors.bgPanelLight,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  buttonText: {
    color: colors.bgDeep,
    fontWeight: '700',
  },
  error: {
    color: colors.redSuit,
  },
});
