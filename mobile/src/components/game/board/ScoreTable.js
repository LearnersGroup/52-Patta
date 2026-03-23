import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fonts } from '../../../styles/theme';

const RND_CELL_W = 46;
const MIN_COL_W  = 76;

/**
 * ScoreTable — reusable score table for judgement and kaliteri.
 */
export default function ScoreTable({
  seatOrder = [],
  scores = {},
  getName,
  gameType,
  userId,
  roundResults = [],
  tricksWon = {},
  bidding = {},
  phase,
  gameHistory = [],
  maxRowHeight = 280,
}) {
  const { width: screenW } = useWindowDimensions();
  const [scrollX, setScrollX] = useState(0);
  const scrollRef = useRef(null);

  const players = useMemo(() =>
    [...(seatOrder || [])].sort((a, b) => (scores?.[b] || 0) - (scores?.[a] || 0)),
  [seatOrder, scores]);

  const containerW   = Math.min(400, screenW - 32);
  const availForCols = containerW - RND_CELL_W;
  const naturalColW  = players.length > 0 ? availForCols / players.length : availForCols;
  const colW         = Math.max(MIN_COL_W, naturalColW);
  const needsHScroll = colW * players.length > availForCols;

  // Index of the current player in the sorted list
  const myIndex = useMemo(() => players.indexOf(userId), [players, userId]);

  // The left edge of the user's column within the scrollable content (relative to the first player column)
  const myColLeft = myIndex >= 0 ? myIndex * colW : -1;

  // Show pinned column when horizontal scroll is needed AND the user's column right edge
  // is past the visible scroll area
  const showPinned = needsHScroll && myIndex >= 0 && (myColLeft + colW) > (scrollX + availForCols);

  const handleScroll = useCallback((e) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  }, []);

  const renderPlayerCell = (pid, cellFn) => (
    <View
      key={pid}
      style={[
        styles.playerCell,
        { width: colW },
        pid === userId && styles.playerCellHighlight,
      ]}
    >
      {cellFn(pid)}
    </View>
  );

  const renderPlayerCells = (cellFn) =>
    players.map((pid) => renderPlayerCell(pid, cellFn));

  // Render a single pinned column for the current user
  const renderPinnedCell = (cellFn) => (
    <View style={[styles.playerCell, styles.playerCellHighlight, styles.pinnedCell, { width: colW }]}>
      {cellFn(userId)}
    </View>
  );

  // ── Judgement table ─────────────────────────────────────────────────────
  if (gameType === 'judgement') {
    const tableContent = (
      <View>
        <View style={styles.row}>
          <View style={styles.rndCell}>
            <Text style={styles.colHead}>#</Text>
          </View>
          {renderPlayerCells((pid) => (
            <Text style={[styles.colHead, pid === userId && styles.colHeadMe]} numberOfLines={1}>{getName(pid)}</Text>
          ))}
        </View>

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

    if (!needsHScroll) return tableContent;

    // Pinned column overlay for judgement
    const pinnedOverlay = showPinned ? (
      <View style={[styles.pinnedOverlay, { right: 0 }]} pointerEvents="none">
        <View style={styles.row}>{renderPinnedCell((pid) => (
          <Text style={[styles.colHead, styles.colHeadMe]} numberOfLines={1}>{getName(pid)}</Text>
        ))}</View>

        <ScrollView style={{ maxHeight: maxRowHeight }} scrollEnabled={false}>
          {(roundResults || []).map((rr, idx) => (
            <View key={`rp-${rr?.roundNumber}`} style={[styles.row, idx % 2 === 0 && styles.rowAlt]}>
              {renderPinnedCell((pid) => {
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
          {phase === 'playing' ? (
            <View style={[styles.row, styles.rowLive]}>
              {renderPinnedCell((pid) => (
                <Text style={styles.wonBid}>
                  {tricksWon?.[pid] || 0}/{bidding?.bids?.[pid] ?? '?'}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.row, styles.rowTotal]}>
          {renderPinnedCell((pid) => (
            <Text style={styles.totalValue}>{scores?.[pid] || 0}</Text>
          ))}
        </View>
      </View>
    ) : null;

    return (
      <View style={{ position: 'relative' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {tableContent}
        </ScrollView>
        {pinnedOverlay}
      </View>
    );
  }

  // ── Kaliteri table (players on X-axis, games on Y-axis) ───────────────
  const kalTableContent = (
    <View>
      <View style={styles.row}>
        <View style={styles.rndCell}>
          <Text style={styles.colHead}>#</Text>
        </View>
        {renderPlayerCells((pid) => (
          <Text style={[styles.colHead, pid === userId && styles.colHeadMe]} numberOfLines={1}>{getName(pid)}</Text>
        ))}
      </View>

      <ScrollView style={{ maxHeight: maxRowHeight }}>
        {(gameHistory || []).map((gh, idx) => (
          <View key={`g-${gh?.gameNumber}`} style={[styles.row, idx % 2 === 0 && styles.rowAlt]}>
            <View style={styles.rndCell}>
              <Text style={styles.rndNum}>{gh?.gameNumber}</Text>
            </View>
            {renderPlayerCells((pid) => {
              const delta = gh?.playerDeltas?.[pid] ?? 0;
              const positive = delta > 0;
              return (
                <Text style={[styles.delta, positive ? styles.deltaHit : styles.deltaMiss]}>
                  {positive ? `+${delta}` : delta}
                </Text>
              );
            })}
          </View>
        ))}
      </ScrollView>

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

  if (!needsHScroll) return kalTableContent;

  // Pinned column overlay for kaliteri
  const kalPinnedOverlay = showPinned ? (
    <View style={[styles.pinnedOverlay, { right: 0 }]} pointerEvents="none">
      <View style={styles.row}>{renderPinnedCell((pid) => (
        <Text style={[styles.colHead, styles.colHeadMe]} numberOfLines={1}>{getName(pid)}</Text>
      ))}</View>

      <ScrollView style={{ maxHeight: maxRowHeight }} scrollEnabled={false}>
        {(gameHistory || []).map((gh, idx) => (
          <View key={`gp-${gh?.gameNumber}`} style={[styles.row, idx % 2 === 0 && styles.rowAlt]}>
            {renderPinnedCell((pid) => {
              const delta = gh?.playerDeltas?.[pid] ?? 0;
              const positive = delta > 0;
              return (
                <Text style={[styles.delta, positive ? styles.deltaHit : styles.deltaMiss]}>
                  {positive ? `+${delta}` : delta}
                </Text>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.row, styles.rowTotal]}>
        {renderPinnedCell((pid) => (
          <Text style={styles.totalValue}>{scores?.[pid] || 0}</Text>
        ))}
      </View>
    </View>
  ) : null;

  return (
    <View style={{ position: 'relative' }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {kalTableContent}
      </ScrollView>
      {kalPinnedOverlay}
    </View>
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

  // ── Cells ─────────────────────────────────────────────────────────────
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
  playerCellHighlight: {
    backgroundColor: 'rgba(201,162,39,0.08)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: 'rgba(201,162,39,0.45)',
    borderRightColor: 'rgba(201,162,39,0.45)',
  },
  pinnedCell: {
    backgroundColor: 'rgba(15, 35, 20, 0.95)',
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },

  // ── Pinned overlay ────────────────────────────────────────────────────
  pinnedOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },

  // ── Cell text ─────────────────────────────────────────────────────────
  colHead: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  colHeadMe: {
    color: colors.goldLight,
    textDecorationLine: 'underline',
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
});
