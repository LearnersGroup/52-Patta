import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WsJudgementBid } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, pillStyle, spacing } from '../../../styles/theme';

/**
 * Compact Judgement bidding panel — lives in the centre of the CircularTable.
 *
 * Shows:
 *  • Who is currently bidding (name + tally)
 *  • Bid controls (−/amount/+  +  "Bid N" button) when it is MY turn
 *  • Optional countdown timer
 */
export default function JudgementBiddingPanel({
  bidding,
  userId,
  cardsInRound = 0,
  getName,
  bidCountdownSec = null,
}) {
  const bidOrder          = bidding?.bidOrder || [];
  const currentBidderIdx  = bidding?.currentBidderIndex ?? 0;
  const currentBidder     = bidOrder[currentBidderIdx] || null;
  const isMyTurn          = currentBidder === userId;
  const totalBidsSoFar    = bidding?.totalBids || 0;
  const isDealerTurn      = currentBidderIdx === bidOrder.length - 1;
  const forbiddenBid      = isDealerTurn ? cardsInRound - totalBidsSoFar : null;

  const [amount, setAmount] = useState(0);

  // Auto-adjust away from forbidden bid
  useEffect(() => {
    if (!isMyTurn) return;
    if (forbiddenBid === 0) {
      setAmount(1);
    } else if (amount === forbiddenBid) {
      setAmount((prev) => {
        const next = prev + 1;
        return next > cardsInRound ? Math.max(0, prev - 1) : next;
      });
    }
  }, [forbiddenBid, isMyTurn, cardsInRound, amount]);

  const adjust = (delta) => {
    setAmount((prev) => {
      let next = Math.max(0, Math.min(cardsInRound, prev + delta));
      if (forbiddenBid !== null && next === forbiddenBid) {
        next = Math.max(0, Math.min(cardsInRound, next + delta));
        if (next === forbiddenBid) next = prev;
      }
      return next;
    });
  };

  if (!bidding) return null;

  const isUrgent = typeof bidCountdownSec === 'number' && bidCountdownSec <= 5;
  const bidderName = currentBidder ? (getName?.(currentBidder) || 'Player') : '—';

  return (
    <View style={styles.wrap}>

      {/* ── Who is bidding + tally ── */}
      <Text style={styles.bidderName} numberOfLines={1}>{bidderName}</Text>
      <Text style={styles.bidderSub}>is bidding</Text>

      <View style={styles.tally}>
        <Text style={styles.tallyCount}>{totalBidsSoFar}</Text>
        <Text style={styles.tallySep}>/</Text>
        <Text style={styles.tallyTotal}>{cardsInRound}</Text>
      </View>
      <Text style={styles.tallySub}>bids placed</Text>

      {/* ── Countdown ── */}
      {typeof bidCountdownSec === 'number' ? (
        <View style={[styles.timerPill, isUrgent && styles.timerUrgent]}>
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            {Math.max(0, bidCountdownSec)}s
          </Text>
        </View>
      ) : null}

      {/* ── Bid controls — only when it's my turn ── */}
      {isMyTurn ? (
        <View style={styles.controls}>
          {forbiddenBid !== null ? (
            <Text style={styles.warning}>Can't bid {forbiddenBid}</Text>
          ) : null}

          <View style={styles.adjustRow}>
            <Pressable
              style={[styles.adjustBtn, amount <= 0 && styles.btnDisabled]}
              disabled={amount <= 0}
              onPress={() => adjust(-1)}
            >
              <Text style={styles.adjustText}>−</Text>
            </Pressable>

            <Text style={styles.amount}>{amount}</Text>

            <Pressable
              style={[styles.adjustBtn, amount >= cardsInRound && styles.btnDisabled]}
              disabled={amount >= cardsInRound}
              onPress={() => adjust(1)}
            >
              <Text style={styles.adjustText}>+</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.bidBtn,
              forbiddenBid !== null && amount === forbiddenBid && styles.btnDisabled,
            ]}
            disabled={forbiddenBid !== null && amount === forbiddenBid}
            onPress={() => WsJudgementBid(amount)}
          >
            <Text style={styles.bidBtnText}>Bid {amount}</Text>
          </Pressable>
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    flex: 1,
    paddingVertical: 8,
  },

  bidderName: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.gold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bidderSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.creamMuted,
    letterSpacing: 0.3,
  },

  tally: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 1,
  },
  tallyCount: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.cream,
    fontWeight: '700',
  },
  tallySep: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.creamMuted,
    marginHorizontal: 1,
  },
  tallyTotal: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.creamMuted,
    fontWeight: '700',
  },
  tallySub: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  timerPill: {
    ...pillStyle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginVertical: 2,
  },
  timerUrgent: {
    borderColor: colors.redSuit,
    backgroundColor: 'rgba(204, 41, 54, 0.12)',
  },
  timerText: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.goldLight,
    fontWeight: '700',
  },
  timerTextUrgent: {
    color: colors.redSuit,
  },

  // ── Bid controls ────────────────────────────────────────────────────────────
  controls: {
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    width: '100%',
  },
  warning: {
    fontFamily: fonts.body,
    color: colors.redSuit,
    fontSize: 10,
    fontWeight: '700',
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adjustBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  amount: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontSize: 20,
    minWidth: 36,
    textAlign: 'center',
  },
  bidBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    alignSelf: 'stretch',
  },
  bidBtnText: {
    ...buttonStyles.primaryText,
    fontSize: 12,
  },
  btnDisabled: {
    ...buttonStyles.disabled,
  },
});
