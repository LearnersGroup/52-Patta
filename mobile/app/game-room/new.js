import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { socket } from '../../src/api/socket';
import { useAuth } from '../../src/hooks/useAuth';
import AppBackground from '../../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  spacing,
  typography,
} from '../../src/styles/theme';

// ─── helpers ──────────────────────────────────────────────────────────────────

const isDeckCountValid = (playerCount, deckCount) => {
  return (52 * deckCount) % playerCount <= 4 * deckCount;
};

// Ported verbatim from web client's RoomConfigForm.jsx
function computeKaliteriConfig(playerCount, deckCount) {
  if (!isDeckCountValid(playerCount, deckCount)) return null;
  const N         = playerCount;
  const D         = deckCount;
  const baseCards = 52 * D;
  const removeTwos  = baseCards % N;
  const totalCards  = baseCards - removeTwos;
  const cardsPerPlayer = totalCards / N;
  const partnerCards   = Math.floor(N / 2) - 1;
  return { totalCards, cardsPerPlayer, rounds: cardsPerPlayer, partnerCards };
}

// ─── sub-components ───────────────────────────────────────────────────────────

const NumberStepper = ({ value, min, max, step = 1, onChange, suffix = '' }) => {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={styles.stepper}>
      <Pressable style={[styles.stepBtn, value <= min && styles.stepBtnOff]} onPress={dec} disabled={value <= min}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}{suffix}</Text>
      <Pressable style={[styles.stepBtn, value >= max && styles.stepBtnOff]} onPress={inc} disabled={value >= max}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
};

const ChipGroup = ({ options, value, onChange, disabled: disabledSet = [] }) => (
  <View style={styles.chipRow}>
    {options.map(opt => {
      const off = disabledSet.includes(opt.value);
      const on  = value === opt.value;
      return (
        <Pressable
          key={opt.value}
          style={[styles.chip, on && styles.chipActive, off && styles.chipOff]}
          onPress={() => !off && onChange(opt.value)}
          disabled={off}
        >
          <Text style={[styles.chipText, on && styles.chipTextActive]}>{opt.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

// A single setting row: label on the left, control on the right
const Row = ({ label, children }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.settingControl}>{children}</View>
  </View>
);

// Horizontal dot-separated info pill
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

// ─── screen ───────────────────────────────────────────────────────────────────

export default function NewGameRoomScreen() {
  const router  = useRouter();
  const { user } = useAuth();

  const [gameType,    setGameType]    = useState('kaliteri');
  const [playerCount, setPlayerCount] = useState(4);
  const [deckCount,   setDeckCount]   = useState(1);

  // Kaliteri settings
  const [bidThreshold,  setBidThreshold]  = useState(200);
  const [gameCount,     setGameCount]     = useState(4);
  const [bidWindow,     setBidWindow]     = useState(15);
  const [inspectTime,   setInspectTime]   = useState(15);

  // Judgement settings
  const [maxCardsPerRound, setMaxCardsPerRound] = useState(7);
  const [reverseOrder,     setReverseOrder]     = useState(true);
  const [trumpMode,        setTrumpMode]        = useState('cyclic');
  const [scoreboardTime,   setScoreboardTime]   = useState(5);
  const [bidTimeEnabled,   setBidTimeEnabled]   = useState(false);
  const [bidTime,          setBidTime]          = useState(15);
  const [cardRevealTime,   setCardRevealTime]   = useState(10);

  // Mendikot settings
  const [mendikotTrumpMode,    setMendikotTrumpMode]    = useState('band');
  const [mendikotRounds,       setMendikotRounds]       = useState(1);
  const [mendikotPickPhase,    setMendikotPickPhase]    = useState(true);

  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState('');

  const minPlayers      = gameType === 'judgement' ? 3 : 4;
  const mendikotPlayerStep = gameType === 'mendikot' ? 2 : 1;
  const isOddPlayers    = playerCount % 2 === 1;
  const maxPossibleCards = useMemo(
    () => Math.max(1, Math.floor((52 * deckCount) / playerCount)),
    [deckCount, playerCount],
  );

  // ── derived info-row values ──────────────────────────────────────────────
  const kaliteriInfo = useMemo(() => {
    const cfg = computeKaliteriConfig(playerCount, deckCount);
    if (!cfg) return ['Invalid configuration'];
    const { totalCards, cardsPerPlayer, rounds, partnerCards } = cfg;
    const isOdd = playerCount % 2 === 1;
    // Odd player counts unlock an extra partner card at bid threshold → show n+1
    const partnerLabel = isOdd
      ? `${partnerCards}+1 partner cards @ ${bidThreshold} bid`
      : `${partnerCards} partner card${partnerCards !== 1 ? 's' : ''}`;
    return [
      `${cardsPerPlayer} cards per player`,
      partnerLabel,
    ];
  }, [playerCount, deckCount, bidThreshold]);

  const judgementInfo = useMemo(() => {
    const totalRounds = reverseOrder
      ? 2 * maxCardsPerRound - 1
      : maxCardsPerRound;
    const seq = reverseOrder
      ? `1 → ${maxCardsPerRound} → 1`
      : `1 → ${maxCardsPerRound}`;
    return [
      `max ${maxPossibleCards} cards/player`,
      `${totalRounds} rounds`,
      `sequence: ${seq}`,
    ];
  }, [maxPossibleCards, maxCardsPerRound, reverseOrder]);

  const mendikotInfo = useMemo(() => [
    `${playerCount} players`,
    mendikotTrumpMode === 'band' ? 'Band Hukum' : 'Cut Hukum',
    `${mendikotRounds} round${mendikotRounds !== 1 ? 's' : ''}`,
  ], [playerCount, mendikotTrumpMode, mendikotRounds]);

  // ── socket / lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    const onRedirect = (roomId, cb) => {
      setCreating(false);
      router.replace(`/game-room/${roomId}`);
      if (typeof cb === 'function') cb({ status: 200 });
    };
    socket.on('redirect-to-game-room', onRedirect);
    return () => socket.off('redirect-to-game-room', onRedirect);
  }, [router]);

  useEffect(() => {
    setPlayerCount(prev => Math.max(minPlayers, prev));
  }, [minPlayers]);

  useEffect(() => {
    if (gameType === 'judgement') {
      setDeckCount(playerCount <= 6 ? 1 : 2);
      return;
    }
    if (!isDeckCountValid(playerCount, deckCount)) setDeckCount(2);
  }, [deckCount, gameType, playerCount]);

  useEffect(() => {
    setMaxCardsPerRound(prev => Math.max(1, Math.min(prev, maxPossibleCards)));
  }, [maxPossibleCards]);

  if (!user)                  return <Redirect href="/login" />;
  if (user?.needs_onboarding) return <Redirect href="/create-user" />;

  // ── handlers ────────────────────────────────────────────────────────────
  const toggleGameType = (value) => {
    setGameType(value);
    if (value === 'judgement' && playerCount < 3) setPlayerCount(3);
    if (value === 'kaliteri'  && playerCount < 4) setPlayerCount(4);
    if (value === 'mendikot') {
      // Mendikot requires even player count >= 4
      const next = playerCount < 4 ? 4 : playerCount % 2 === 1 ? playerCount + 1 : playerCount;
      setPlayerCount(next);
    }
  };

  const onCreateRoom = () => {
    const roomname = `${user?.user_name || 'Player'}'s Room`;
    const payload  = {
      roomname,
      player_count: playerCount,
      game_type:    gameType,
      deck_count:   deckCount,
    };

    if (gameType === 'kaliteri') {
      payload.game_count   = gameCount;
      payload.bid_window   = bidWindow;
      payload.inspect_time = inspectTime;
      if (isOddPlayers) payload.bid_threshold = bidThreshold;
    } else if (gameType === 'mendikot') {
      payload.trump_mode             = mendikotTrumpMode;
      payload.rounds_count           = mendikotRounds;
      payload.band_hukum_pick_phase  = mendikotPickPhase;
    } else {
      payload.max_cards_per_round = maxCardsPerRound;
      payload.reverse_order       = reverseOrder;
      payload.trump_mode          = trumpMode;
      payload.scoreboard_time     = scoreboardTime;
      payload.card_reveal_time    = cardRevealTime;
      if (bidTimeEnabled) payload.judgement_bid_time = bidTime;
    }

    setError('');
    setCreating(true);
    socket.emit('user-create-room', payload, (err) => {
      if (err) { setCreating(false); setError(String(err)); }
    });
  };

  // ── disabled deck values ─────────────────────────────────────────────────
  const disabledDecks = gameType === 'judgement'
    ? (playerCount <= 6 ? [2] : [1])
    : gameType === 'mendikot'
    ? [2]   // mendikot always uses 1 deck
    : (!isDeckCountValid(playerCount, 1) ? [1] : []);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <AppBackground>
      {/* ── header ── */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create Room</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── game type cards ── */}
        <Text style={styles.sectionLabel}>Game Type</Text>
        <View style={styles.gameTypeRow}>

          {/* Kaliteri card */}
          <Pressable
            style={[styles.gameTypeCard, gameType === 'kaliteri' && styles.gameTypeCardActive]}
            onPress={() => toggleGameType('kaliteri')}
          >
            <Text style={styles.gameTypeSuits}>
              <Text style={styles.suitBlack}>♠ </Text>
              <Text style={styles.suitBlack}>♠ </Text>
              <Text style={styles.suitBlack}>♠</Text>
            </Text>
            <Text style={[styles.gameTypeName, gameType === 'kaliteri' && styles.gameTypeNameActive]}>
              Kaliteri
            </Text>
          </Pressable>

          {/* Judgement card */}
          <Pressable
            style={[styles.gameTypeCard, gameType === 'judgement' && styles.gameTypeCardActive]}
            onPress={() => toggleGameType('judgement')}
          >
            <Text style={styles.gameTypeSuits}>
              <Text style={styles.suitBlack}>♠</Text>
              <Text style={styles.suitRed}> ♦</Text>
              <Text style={styles.suitBlack}> ♣</Text>
              <Text style={styles.suitRed}> ♥</Text>
            </Text>
            <Text style={[styles.gameTypeName, gameType === 'judgement' && styles.gameTypeNameActive]}>
              Judgement
            </Text>
          </Pressable>

          {/* Mendikot card */}
          <Pressable
            style={[styles.gameTypeCard, gameType === 'mendikot' && styles.gameTypeCardActive]}
            onPress={() => toggleGameType('mendikot')}
          >
            <Text style={styles.gameTypeSuits}>
              <Text style={styles.suitBlack}>♣</Text>
              <Text style={styles.suitRed}> ♦</Text>
              <Text style={styles.suitRed}> ♥</Text>
              <Text style={styles.suitBlack}> ♠</Text>
            </Text>
            <Text style={[styles.gameTypeName, gameType === 'mendikot' && styles.gameTypeNameActive]}>
              Mendikot
            </Text>
          </Pressable>

        </View>

        {/* ── info row ── */}
        <InfoRow items={gameType === 'kaliteri' ? kaliteriInfo : gameType === 'mendikot' ? mendikotInfo : judgementInfo} />

        {/* ── players & decks panel ── */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Players & Decks</Text>
          <View style={styles.pdRow}>

            {/* Players */}
            <View style={styles.pdHalf}>
              <NumberStepper
                value={playerCount}
                min={minPlayers}
                max={gameType === 'mendikot' ? 12 : 13}
                step={mendikotPlayerStep}
                onChange={setPlayerCount}
              />
            </View>

            <View style={styles.pdDivider} />

            {/* Decks */}
            <View style={styles.pdHalf}>
              <ChipGroup
                options={[{ label: '1 Deck', value: 1 }, { label: '2 Decks', value: 2 }]}
                value={deckCount}
                onChange={setDeckCount}
                disabled={disabledDecks}
              />
            </View>

          </View>
        </View>

        {/* ── game settings panel ── */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {gameType === 'kaliteri' ? 'Kaliteri Settings' : gameType === 'mendikot' ? 'Mendikot Settings' : 'Judgement Settings'}
          </Text>

          {gameType === 'mendikot' ? (
            <>
              <Row label="Trump Mode">
                <ChipGroup
                  options={[
                    { label: 'Band Hukum', value: 'band' },
                    { label: 'Cut Hukum', value: 'cut' },
                  ]}
                  value={mendikotTrumpMode}
                  onChange={setMendikotTrumpMode}
                />
              </Row>
              {mendikotTrumpMode === 'band' && (
                <Row label="Pick Phase">
                  <ChipGroup
                    options={[
                      { label: 'On', value: true },
                      { label: 'Off', value: false },
                    ]}
                    value={mendikotPickPhase}
                    onChange={setMendikotPickPhase}
                  />
                </Row>
              )}
              <Row label="Rounds">
                <NumberStepper value={mendikotRounds} min={1} max={20} onChange={setMendikotRounds} />
              </Row>
            </>
          ) : gameType === 'kaliteri' ? (
            <>
              {isOddPlayers && (
                <Row label="Bid Threshold">
                  <NumberStepper value={bidThreshold} min={155} max={500} step={5} onChange={setBidThreshold} />
                </Row>
              )}
              <Row label="Number of Games">
                <NumberStepper value={gameCount} min={1} max={20} onChange={setGameCount} />
              </Row>
              <Row label="Bidding Window">
                <NumberStepper value={bidWindow} min={5} max={60} step={5} onChange={setBidWindow} suffix="s" />
              </Row>
              <Row label="Card Inspect Time">
                <NumberStepper value={inspectTime} min={5} max={30} step={5} onChange={setInspectTime} suffix="s" />
              </Row>
            </>
          ) : (
            <>
              <Row label="Max Cards / Round">
                <NumberStepper value={maxCardsPerRound} min={1} max={maxPossibleCards} onChange={setMaxCardsPerRound} />
              </Row>
              <Row label="Round Order">
                <ChipGroup
                  options={[{ label: 'Up & Down', value: true }, { label: 'Ascending', value: false }]}
                  value={reverseOrder}
                  onChange={setReverseOrder}
                />
              </Row>
              <Row label="Powerhouse Selection">
                <ChipGroup
                  options={[{ label: 'Cyclic', value: 'cyclic' }, { label: 'Random', value: 'random' }]}
                  value={trumpMode}
                  onChange={setTrumpMode}
                />
              </Row>
              <Row label="Scoreboard Time">
                <NumberStepper value={scoreboardTime} min={3} max={30} onChange={setScoreboardTime} suffix="s" />
              </Row>
              <Row label="Bid Timer">
                <ChipGroup
                  options={[{ label: 'No Limit', value: false }, { label: 'Timed', value: true }]}
                  value={bidTimeEnabled}
                  onChange={setBidTimeEnabled}
                />
              </Row>
              {bidTimeEnabled && (
                <Row label="Bid Time">
                  <NumberStepper value={bidTime} min={5} max={60} step={5} onChange={setBidTime} suffix="s" />
                </Row>
              )}
              <Row label="Card Inspect Time">
                <NumberStepper value={cardRevealTime} min={3} max={30} onChange={setCardRevealTime} suffix="s" />
              </Row>
            </>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[buttonStyles.base, buttonStyles.secondary, styles.actionBtn]}
            onPress={() => router.back()}
          >
            <Text style={buttonStyles.secondaryText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[buttonStyles.base, buttonStyles.primary, styles.actionBtn, creating && buttonStyles.disabled]}
            onPress={onCreateRoom}
            disabled={creating}
          >
            {creating
              ? <ActivityIndicator color={colors.buttonText} />
              : <Text style={buttonStyles.primaryText}>Create Room</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </AppBackground>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // Header — matches profile / avatar-editor
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
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(201,162,39,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Scroll content
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  // Section label above game type cards
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },

  // ── Game type cards ──────────────────────────────────────────────────────
  gameTypeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gameTypeCard: {
    flex: 1,
    minHeight: 96,
    ...panelStyle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  gameTypeCardActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,162,39,0.12)',
    shadowColor: 'rgba(201,162,39,0.35)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  gameTypeSuits: {
    fontSize: 22,
    letterSpacing: 2,
  },
  suitBlack: {
    color: colors.gold,
  },
  suitRed: {
    color: colors.redSuit,
  },
  gameTypeName: {
    fontFamily: fonts.headingMedium,
    fontSize: 13,
    color: colors.creamMuted,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  gameTypeNameActive: {
    color: colors.gold,
  },

  // ── Info row ─────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,39,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.12)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoDot: {
    color: 'rgba(201,162,39,0.35)',
    fontSize: 14,
    fontFamily: fonts.body,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.creamMuted,
    letterSpacing: 0.4,
  },

  // ── Panels ───────────────────────────────────────────────────────────────
  panel: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.md,
  },
  panelTitle: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },

  // ── Players & Decks dual row ──────────────────────────────────────────────
  pdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdHalf: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'center',
  },
  pdDivider: {
    width: 1,
    height: 52,
    backgroundColor: colors.borderGold,
    marginHorizontal: spacing.sm,
  },
  pdLabel: {
    fontFamily: fonts.heading,
    fontSize: 10,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // ── Setting rows (game-specific settings) ───────────────────────────────
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 36,
  },
  settingLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.creamMuted,
    letterSpacing: 1,
    flex: 1,
  },
  settingControl: {
    alignItems: 'flex-end',
  },

  // ── NumberStepper ─────────────────────────────────────────────────────────
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 32,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: {
    opacity: 0.3,
  },
  stepBtnText: {
    color: colors.goldLight,
    fontSize: 18,
    lineHeight: 18,
    fontFamily: fonts.bodyBold,
  },
  stepValue: {
    minWidth: 48,
    color: colors.cream,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },

  // ── ChipGroup ─────────────────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  chipOff: {
    opacity: 0.3,
  },
  chipText: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
  },

  // ── Error ────────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 7,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.redSuit,
    fontSize: 13,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
  },
});
