import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  buttonStyles,
  colors,
  dividerStyle,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../../styles/theme';

const isDeckCountValid = (playerCount, deckCount) => {
  const removeTwos = (52 * deckCount) % playerCount;
  return removeTwos <= 4 * deckCount;
};

function NumberStepper({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - step))}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>
          {value}
          {suffix}
        </Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + step))}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function LobbyConfigEditor({ roomData, onSave, onCancel }) {
  const [gameType, setGameType] = useState('kaliteri');
  const [playerCount, setPlayerCount] = useState(4);
  const [deckCount, setDeckCount] = useState(1);
  const [bidThreshold, setBidThreshold] = useState(200);
  const [gameCount, setGameCount] = useState(4);
  const [bidWindow, setBidWindow] = useState(15);
  const [inspectTime, setInspectTime] = useState(15);
  const [maxCardsPerRound, setMaxCardsPerRound] = useState(7);
  const [reverseOrder, setReverseOrder] = useState(true);
  const [trumpMode, setTrumpMode] = useState('cyclic');
  const [scoreboardTime, setScoreboardTime] = useState(5);
  const [bidTimeEnabled, setBidTimeEnabled] = useState(false);
  const [bidTime, setBidTime] = useState(15);
  const [cardRevealTime, setCardRevealTime] = useState(10);

  const minPlayers = gameType === 'judgement' ? 3 : 4;
  const maxPossibleCards = useMemo(
    () => Math.max(1, Math.floor((52 * deckCount) / playerCount)),
    [deckCount, playerCount]
  );

  useEffect(() => {
    const gt = roomData?.game_type || 'kaliteri';
    const pc = roomData?.player_count || (gt === 'judgement' ? 3 : 4);
    const dc = roomData?.deck_count || (gt === 'judgement' ? (pc <= 6 ? 1 : 2) : 1);

    setGameType(gt);
    setPlayerCount(pc);
    setDeckCount(dc);
    setBidThreshold(roomData?.bid_threshold || 200);
    setGameCount(roomData?.game_count || pc);
    setBidWindow(roomData?.bid_window || 15);
    setInspectTime(roomData?.inspect_time || 15);
    setMaxCardsPerRound(roomData?.max_cards_per_round || 7);
    setReverseOrder(roomData?.reverse_order ?? true);
    setTrumpMode(roomData?.trump_mode || 'fixed');
    setScoreboardTime(roomData?.scoreboard_time || 5);
    setBidTimeEnabled(roomData?.judgement_bid_time !== null && roomData?.judgement_bid_time !== undefined);
    setBidTime(roomData?.judgement_bid_time || 15);
    setCardRevealTime(roomData?.card_reveal_time || 10);
  }, [roomData]);

  useEffect(() => {
    if (gameType === 'judgement') {
      if (playerCount <= 6) setDeckCount(1);
      else setDeckCount(2);
    } else if (!isDeckCountValid(playerCount, deckCount)) {
      setDeckCount(2);
    }
  }, [gameType, playerCount, deckCount]);

  const submit = () => {
    const payload = {
      game_type: gameType,
      player_count: playerCount,
      deck_count: deckCount,
    };

    if (gameType === 'kaliteri') {
      payload.game_count = gameCount;
      payload.bid_window = bidWindow;
      payload.inspect_time = inspectTime;
      payload.bid_threshold = playerCount % 2 === 1 ? bidThreshold : null;
    } else {
      payload.max_cards_per_round = maxCardsPerRound;
      payload.reverse_order = reverseOrder;
      payload.trump_mode = trumpMode;
      payload.scoreboard_time = scoreboardTime;
      payload.judgement_bid_time = bidTimeEnabled ? bidTime : null;
      payload.card_reveal_time = cardRevealTime;
    }

    onSave?.(payload);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <Text style={styles.label}>Game Type</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, gameType === 'kaliteri' && styles.chipActive]} onPress={() => setGameType('kaliteri')}>
            <Text style={styles.chipText}>Kaliteri</Text>
          </Pressable>
          <Pressable style={[styles.chip, gameType === 'judgement' && styles.chipActive]} onPress={() => setGameType('judgement')}>
            <Text style={styles.chipText}>Judgement</Text>
          </Pressable>
        </View>
      </View>

      <NumberStepper label="Players" value={playerCount} min={minPlayers} max={13} onChange={setPlayerCount} />

      <View style={styles.group}>
        <Text style={styles.label}>Decks</Text>
        <View style={styles.row}>
          <Pressable style={[styles.chip, deckCount === 1 && styles.chipActive]} onPress={() => setDeckCount(1)}>
            <Text style={styles.chipText}>1 Deck</Text>
          </Pressable>
          <Pressable style={[styles.chip, deckCount === 2 && styles.chipActive]} onPress={() => setDeckCount(2)}>
            <Text style={styles.chipText}>2 Decks</Text>
          </Pressable>
        </View>
      </View>

      {gameType === 'kaliteri' ? (
        <>
          {playerCount % 2 === 1 ? (
            <NumberStepper label="Bid Threshold" value={bidThreshold} min={155} max={500} step={5} onChange={setBidThreshold} />
          ) : null}
          <NumberStepper label="Games" value={gameCount} min={1} max={20} onChange={setGameCount} />
          <NumberStepper label="Bid Window" value={bidWindow} min={5} max={60} step={5} suffix="s" onChange={setBidWindow} />
          <NumberStepper label="Inspect Time" value={inspectTime} min={5} max={30} step={5} suffix="s" onChange={setInspectTime} />
        </>
      ) : (
        <>
          <NumberStepper
            label="Max Cards / Round"
            value={maxCardsPerRound}
            min={1}
            max={maxPossibleCards}
            onChange={setMaxCardsPerRound}
          />
          <View style={styles.group}>
            <Text style={styles.label}>Reverse Order</Text>
            <View style={styles.row}>
              <Pressable style={[styles.chip, !reverseOrder && styles.chipActive]} onPress={() => setReverseOrder(false)}>
                <Text style={styles.chipText}>No</Text>
              </Pressable>
              <Pressable style={[styles.chip, reverseOrder && styles.chipActive]} onPress={() => setReverseOrder(true)}>
                <Text style={styles.chipText}>Yes</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Trump Mode</Text>
            <View style={styles.row}>
              <Pressable style={[styles.chip, trumpMode === 'fixed' && styles.chipActive]} onPress={() => setTrumpMode('fixed')}>
                <Text style={styles.chipText}>Fixed</Text>
              </Pressable>
              <Pressable style={[styles.chip, trumpMode === 'random' && styles.chipActive]} onPress={() => setTrumpMode('random')}>
                <Text style={styles.chipText}>Random</Text>
              </Pressable>
            </View>
          </View>
          <NumberStepper label="Scoreboard" value={scoreboardTime} min={3} max={30} suffix="s" onChange={setScoreboardTime} />
          <View style={styles.group}>
            <Text style={styles.label}>Bid Timer</Text>
            <View style={styles.row}>
              <Pressable style={[styles.chip, !bidTimeEnabled && styles.chipActive]} onPress={() => setBidTimeEnabled(false)}>
                <Text style={styles.chipText}>No Limit</Text>
              </Pressable>
              <Pressable style={[styles.chip, bidTimeEnabled && styles.chipActive]} onPress={() => setBidTimeEnabled(true)}>
                <Text style={styles.chipText}>Limit</Text>
              </Pressable>
            </View>
          </View>
          {bidTimeEnabled ? (
            <NumberStepper label="Bid Time" value={bidTime} min={5} max={60} step={5} suffix="s" onChange={setBidTime} />
          ) : null}
          <NumberStepper label="Reveal Time" value={cardRevealTime} min={3} max={30} suffix="s" onChange={setCardRevealTime} />
        </>
      )}

      <View style={styles.divider} />
      <View style={styles.actionRow}>
        <Pressable style={[buttonStyles.base, buttonStyles.secondary, { flex: 1 }]} onPress={onCancel}>
          <Text style={buttonStyles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable style={[buttonStyles.base, buttonStyles.primary, { flex: 1 }]} onPress={submit}>
          <Text style={buttonStyles.primaryText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  group: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
    letterSpacing: 1.8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  // Chips with gold border when active
  chip: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  chipText: {
    fontFamily: fonts.body,
    color: colors.cream,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Stepper buttons (bid-adjust style)
  stepBtn: {
    width: 36,
    height: 32,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPanelLight,
  },
  stepText: {
    color: colors.gold,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  stepValue: {
    fontFamily: fonts.bodyBold,
    color: colors.cream,
    fontWeight: '700',
    fontSize: 15,
    minWidth: 56,
    textAlign: 'center',
  },
  divider: {
    ...dividerStyle,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
