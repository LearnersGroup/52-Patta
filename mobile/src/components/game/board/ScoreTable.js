import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fonts, spacing } from '../../../styles/theme';

const RND_CELL_W = 46;
const MIN_COL_W  = 76;

/**
 * ScoreTable — reusable score table for judgement and kaliteri.
 *
 * Props
 * ─────
 * seatOrder     string[]
 * scores        { [pid]: number }
 * getName       (pid) => string
 * gameType      'judgement' | 'kaliteri'
 * roundResults  array  (judgement only)
 * tricksWon     object (judgement, live row)
 * bidding       object (judgement, live row)
 * phase         string (shows live row when 'playing')
 * maxRowHeight  number (max scrollable height for round rows, default 280)
 */
export default function ScoreTable({
  seatOrder = [],
  scores = {},
  getName,
  gameType,
  roundResults = [],
  tricksWon = {},
  bidding = {},
  phase,
  maxRowHeight = 280,
}) {
  const { width: screenW } = useWindowDimensions();

  const players = useMemo(() =>
    [...(seatOrder || [])].sort((a, b) => (scores?.[b] || 0) - (scores?.[a] || 0)),
  [seatOrder, scores]);

  const containerW   = Math.min(400, screenW - 32);
  const availForCols = containerW - RND_CELL_W;
  const naturalColW  = players.length > 0 ? availForCols / players.length : availForCols;
  const colW         = Math.max(MIN_COL_W, naturalColW);
  const needsHScroll = colW * players.length > availForCols;

  const renderPlayerCells = (cellFn) =>
    players.map((pid) => (
      <View key={pid} style={[styles.playerCell, { width: colW }]}>
        {cellFn(pid)}
      </View>
    ));

  // ── Judgement table ─────────────────────────────────────────────────────
  if (gameType === 'judgement') {
    const tableContent = (
      <View>
        {/* Column headers */}
        <View style={styles.row}>
          <View style={styles.rndCell}>
            <Text style={styles.colHead}>#</Text>
          </View>
          {renderPlayerCells((pid) => (
            <Text style={styles.colHead} numberOfLines={1}>{getName(pid)}</Text>
          ))}
        </View>

        {/* Round rows */}
        <ScrollView style={{ maxHeight: maxRowHeight }}>
          {(roundResults || []).map((rr, idx) => (
            <View key={`r-${rr?.roundNumber}`} style={[styles.row, idx % 2 === 0 && styles.rowAlt]}>
              <View style={styles.rndCell}>
                <Text style={styles.rndNum}>{rr?.roundNumber}</Text>
              </View>
              {renderPlayerCells((pid) => {
                const won   = rr?.tricksWon?.[pid] ?? 0;
                const bid   = rr?.bids?.[pid]      ?? 0;
                const delta = rr?.deltas?.[pid]    ?? 0;
                const hit   = delta > 0;
                return (
                  <>
                    <Text style={styles.wonBid}>{won}/{bid}</Text>
                    <Text style={[styles.delta, hit ? styles.deltaHit : styles.deltaMiss]}>
                      {hit ? `+${delta}` : '✗'}
                    </Text>
                  </>
                );
              })}
            </View>
          ))}

          {/* Live row */}
          {phase === 'playing' ? (
            <View style={[styles.row, styles.rowLive]}>
              <View style={styles.rndCell}>
                <Text style={styles.liveLabel}>Now</Text>
              </View>
              {renderPlayerCells((pid) => (
                <Text style={styles.wonBid}>
                  {tricksWon?.[pid] || 0}/{bidding?.bids?.[pid] ?? '?'}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Totals footer */}
        <View style={[styles.row, styles.rowTotal]}>
          <View style={styles.rndCell}>
            <Text style={styles.totalLabel} numberOfLines={1}>Total</Text>
          </View>
          {renderPlayerCells((pid) => (
            <Text style={styles.totalValue}>{scores?.[pid] || 0}</Text>
          ))}
        </View>
      </View>
    );

    return needsHScroll ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tableContent}
      </ScrollView>
    ) : tableContent;
  }

  // ── Kaliteri table ──────────────────────────────────────────────────────
  return (
    <ScrollView style={{ maxHeight: maxRowHeight }}>
      {players.map((pid, idx) => (
        <View key={pid} style={[styles.kalRow, idx % 2 === 0 && styles.rowAlt]}>
          <Text style={styles.kalName} numberOfLines={1}>{getName(pid)}</Text>
          <Text style={styles.kalScore}>{scores?.[pid] || 0}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ── Table rows ──────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  rowAlt: {
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  rowLive: {
    backgroundColor: 'rgba(201,162,39,0.06)',
  },
  rowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    backgroundColor: 'rgba(201,162,39,0.07)',
  },

  // ── Cells ───────────────────────────────────────────────────────────────
  rndCell: {
    width: RND_CELL_W,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(201,162,39,0.2)',
  },
  playerCell: {
    flex: 1,
    minWidth: 56,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(201,162,39,0.12)',
  },

  // ── Cell text ───────────────────────────────────────────────────────────
  colHead: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  rndNum: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.creamMuted,
    textAlign: 'center',
  },
  wonBid: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  delta: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },
  deltaHit: {
    color: colors.readyLight,
  },
  deltaMiss: {
    color: colors.redSuit,
  },
  liveLabel: {
    fontFamily: fonts.heading,
    fontSize: 9,
    color: colors.goldLight,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalLabel: {
    fontFamily: fonts.heading,
    fontSize: 9,
    color: colors.goldLight,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
  },

  // ── Kaliteri rows ───────────────────────────────────────────────────────
  kalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  kalName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.cream,
    flex: 1,
    marginRight: spacing.sm,
  },
  kalScore: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
    minWidth: 40,
    textAlign: 'right',
  },
});
