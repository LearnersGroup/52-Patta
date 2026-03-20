import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WsJudgementBid } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, pillStyle, spacing, typography } from '../../../styles/theme';

export default function JudgementBiddingPanel({ bidding, userId, cardsInRound = 0, getName, bidCountdownSec = null }) {
  const bidOrder = bidding?.bidOrder || [];
  const currentBidderIndex = bidding?.currentBidderIndex ?? 0;
  const currentBidder = bidOrder[currentBidderIndex] || null;
  const isMyTurn = currentBidder === userId;

  const totalBidsSoFar = bidding?.totalBids || 0;
  const isDealerTurn = currentBidderIndex === bidOrder.length - 1;
  const forbiddenBid = isDealerTurn ? cardsInRound - totalBidsSoFar : null;

  const [amount, setAmount] = useState(0);

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

  const bidsPlaced = useMemo(() => bidding?.bids || {}, [bidding?.bids]);

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

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Judgement Bidding</Text>
      <Text style={styles.turnLine}>
        Turn: {currentBidder ? getName?.(currentBidder) || 'Player' : '—'}
      </Text>
      {typeof bidCountdownSec === 'number' ? (
        <View style={[styles.timerPill, isUrgent && styles.timerUrgent]}>
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            Auto-bid in: {Math.max(0, bidCountdownSec)}s
          </Text>
        </View>
      ) : null}

      {isMyTurn ? (
        <>
          {forbiddenBid !== null ? (
            <Text style={styles.warning}>Dealer cannot bid {forbiddenBid}</Text>
          ) : null}

          <View style={styles.adjustRow}>
            <Pressable style={[styles.adjustBtn, amount <= 0 && styles.disabled]} disabled={amount <= 0} onPress={() => adjust(-1)}>
              <Text style={styles.adjustText}>−</Text>
            </Pressable>
            <Text style={styles.amount}>{amount}</Text>
            <Pressable
              style={[styles.adjustBtn, amount >= cardsInRound && styles.disabled]}
              disabled={amount >= cardsInRound}
              onPress={() => adjust(1)}
            >
              <Text style={styles.adjustText}>+</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, forbiddenBid !== null && amount === forbiddenBid && styles.disabled]}
            disabled={forbiddenBid !== null && amount === forbiddenBid}
            onPress={() => WsJudgementBid(amount)}
          >
            <Text style={styles.primaryText}>Bid {amount}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.note}>Waiting for {getName?.(currentBidder) || 'player'}...</Text>
      )}

      <View style={styles.bidsList}>
        {bidOrder.map((pid) => (
          <View key={pid} style={styles.bidRow}>
            <Text style={styles.bidName}>{getName?.(pid) || 'Player'}</Text>
            <Text style={styles.bidVal}>{bidsPlaced[pid] ?? '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...panelStyle,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
  },
  turnLine: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  warning: {
    fontFamily: fonts.body,
    color: colors.redSuit,
    fontSize: 12,
    fontWeight: '700',
  },
  timerPill: {
    ...pillStyle,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  timerUrgent: {
    borderColor: colors.redSuit,
    backgroundColor: 'rgba(204, 41, 54, 0.12)',
  },
  timerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldLight,
  },
  timerTextUrgent: {
    color: colors.redSuit,
  },
  adjustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  adjustBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: {
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  amount: {
    fontFamily: fonts.heading,
    color: colors.cream,
    fontSize: 20,
    minWidth: 55,
    textAlign: 'center',
  },
  primaryBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    width: '100%',
  },
  primaryText: {
    ...buttonStyles.primaryText,
  },
  note: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
  },
  bidsList: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    paddingTop: spacing.xs,
    gap: 2,
    width: '100%',
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidName: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  bidVal: {
    fontFamily: fonts.heading,
    color: colors.goldLight,
    fontWeight: '700',
    fontSize: 13,
  },
  disabled: {
    ...buttonStyles.disabled,
  },
});
