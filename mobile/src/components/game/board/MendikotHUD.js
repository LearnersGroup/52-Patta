import { memo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { cardTokens, colors, fonts, panelStyle, spacing } from '../../../styles/theme';
import CardFace from '../CardFace';
import { cardKey, isRedSuit, suitSymbol } from '../utils/cardMapper';

const TEAM_A_COLOR = '#38bdf8';
const TEAM_B_COLOR = '#f472b6';

/**
 * Compact in-game HUD for Mendikot.
 * Pill: Team A tricks vs Team B tricks + trump indicator + round counter + toggle.
 * Inline panel: per-team tricks + collected tens with CardFace mini icons.
 */
const MendikotHUD = memo(({ phase, onShowSettings, isAdmin, onQuit }) => {
  const [showScoreboard, setShowScoreboard] = useState(false);

  const tricksByTeam    = useSelector((s) => s.game.tricks_by_team) || { A: 0, B: 0 };
  const tensByTeam      = useSelector((s) => s.game.tens_by_team) || { A: 0, B: 0 };
  const tensCardsByTeam = useSelector((s) => s.game.tens_cards_by_team) || { A: [], B: [] };
  const trump_suit      = useSelector((s) => s.game.trump_suit);
  const currentRoundNumber = useSelector((s) => s.game.currentRoundNumber) || 1;
  const totalRounds     = useSelector((s) => s.game.totalRounds) || 1;
  const isPlaying       = phase === 'playing';

  const TEN_W = Math.round(cardTokens.sizes.hand.width * 0.5); // ~28 px

  const renderTens = (team) => {
    const cards = tensCardsByTeam[team] || [];
    if (cards.length === 0) {
      return <Text style={styles.noTens}>–</Text>;
    }
    return (
      <View style={styles.tensRow}>
        {cards.map((card, i) => (
          <View key={cardKey(card) + i} style={[styles.tenIcon, { width: TEN_W, height: Math.round(TEN_W * cardTokens.ratio) }]}>
            <CardFace card={card} width={TEN_W} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.outerWrap}>
      {/* ── Control pill ── */}
      <View style={styles.pill}>
        {isPlaying ? (
          <>
            <View style={styles.teamChip}>
              <View style={[styles.dot, styles.dotA]} />
              <Text style={styles.teamLabel}>A</Text>
              <Text style={[styles.score, { color: TEAM_A_COLOR }]}>{tricksByTeam.A}</Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.teamChip}>
              <View style={[styles.dot, styles.dotB]} />
              <Text style={styles.teamLabel}>B</Text>
              <Text style={[styles.score, { color: TEAM_B_COLOR }]}>{tricksByTeam.B}</Text>
            </View>
            {/* Trump */}
            <View style={styles.trumpChip}>
              {trump_suit ? (
                <Text style={[styles.trumpSymbol, isRedSuit(trump_suit) && styles.trumpRed]}>
                  {suitSymbol(trump_suit)}
                </Text>
              ) : (
                <Text style={styles.trumpUnknown}>?</Text>
              )}
            </View>
            <View style={styles.divider} />
          </>
        ) : null}

        <Text style={styles.roundText}>Rd {currentRoundNumber}/{totalRounds}</Text>

        <Pressable
          style={styles.iconBtn}
          onPress={() => setShowScoreboard((v) => !v)}
          hitSlop={8}
        >
          <Text style={styles.iconText}>{showScoreboard ? '▲' : '⊞'}</Text>
        </Pressable>

        {isAdmin ? (
          <Pressable style={styles.iconBtn} onPress={onQuit} hitSlop={8}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.iconBtn} onPress={onShowSettings} hitSlop={8}>
          <Text style={styles.iconText}>⚙</Text>
        </Pressable>
      </View>

      {/* ── Inline scoreboard panel ── */}
      {showScoreboard ? (
        <View style={styles.scorePanel}>
          {/* Team A */}
          <View style={styles.teamRow}>
            <Text style={[styles.teamRowName, { color: TEAM_A_COLOR }]}>Team A</Text>
            <Text style={styles.tricksText}>{tricksByTeam.A} trick{tricksByTeam.A !== 1 ? 's' : ''}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tensScroll}>
            {renderTens('A')}
          </ScrollView>

          <View style={styles.scoreDivider} />

          {/* Team B */}
          <View style={styles.teamRow}>
            <Text style={[styles.teamRowName, { color: TEAM_B_COLOR }]}>Team B</Text>
            <Text style={styles.tricksText}>{tricksByTeam.B} trick{tricksByTeam.B !== 1 ? 's' : ''}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tensScroll}>
            {renderTens('B')}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
});

MendikotHUD.displayName = 'MendikotHUD';
export default MendikotHUD;

const styles = StyleSheet.create({
  outerWrap: {
    gap: 4,
  },

  // ── Control pill ───────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 42, 25, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.28)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 5,
    alignSelf: 'flex-start',
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  dotA: { backgroundColor: TEAM_A_COLOR },
  dotB: { backgroundColor: TEAM_B_COLOR },
  teamLabel: {
    fontSize: 10,
    fontFamily: fonts.heading,
    color: colors.creamMuted,
    fontWeight: '700',
  },
  score: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    fontWeight: '700',
  },
  vs: {
    fontSize: 10,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  trumpChip: {
    paddingHorizontal: 3,
  },
  trumpSymbol: {
    fontSize: 15,
    color: colors.cream,
    lineHeight: 17,
  },
  trumpRed: {
    color: colors.redSuit,
  },
  trumpUnknown: {
    fontSize: 13,
    color: colors.creamMuted,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(201,162,39,0.3)',
    marginHorizontal: 2,
  },
  roundText: {
    fontSize: 11,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  iconBtn: {
    paddingHorizontal: 3,
  },
  iconText: {
    fontSize: 14,
    color: colors.gold,
    lineHeight: 16,
  },

  // ── Inline scoreboard panel ────────────────────────────────────────────────
  scorePanel: {
    ...panelStyle,
    padding: spacing.sm,
    gap: 4,
    minWidth: 180,
    maxWidth: 220,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  teamRowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    fontWeight: '700',
  },
  tricksText: {
    fontSize: 11,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  tensScroll: {
    marginBottom: 2,
  },
  tensRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  tenIcon: {
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  noTens: {
    fontSize: 11,
    color: colors.creamMuted,
    fontStyle: 'italic',
    fontFamily: fonts.body,
    paddingVertical: 2,
  },
  scoreDivider: {
    height: 1,
    backgroundColor: 'rgba(201,162,39,0.18)',
    marginVertical: 2,
  },
});
