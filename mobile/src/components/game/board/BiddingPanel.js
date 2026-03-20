import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WsPassBid, WsPlaceBid } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, pillStyle, shadows, spacing, typography } from '../../../styles/theme';

function toSeconds(targetMs) {
  if (!targetMs) return null;
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
}

export default function BiddingPanel({ bidding, userId, getName }) {
  const [, setTick] = useState(0);
  const passed = bidding?.passed || bidding?.passes || [];
  const hasPassed = passed.includes(userId);

  const openingInSec = toSeconds(bidding?.biddingWindowOpensAt);
  const isOpen = openingInSec === null || openingInSec <= 0;
  const expiresInSec = isOpen ? toSeconds(bidding?.biddingExpiresAt) : null;

  const minBid = useMemo(
    () =>
      Math.max(
        (bidding?.currentBid || 0) + (bidding?.increment || 5),
        bidding?.startingBid || 150
      ),
    [bidding?.currentBid, bidding?.increment, bidding?.startingBid]
  );

  const [amount, setAmount] = useState(minBid);

  useEffect(() => {
    setAmount((prev) => Math.max(prev, minBid));
  }, [minBid]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(timer);
  }, []);

  if (!bidding) return null;

  const maxBid = bidding?.maxBid || 500;
  const canBid = isOpen && !hasPassed && (expiresInSec === null || expiresInSec > 0);
  const isUrgent = expiresInSec !== null && expiresInSec <= 5;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Open Bidding</Text>

      <Text style={styles.bidLabel}>Current Bid</Text>
      <Text style={styles.currentBid}>
        {bidding?.currentBid || 0}
      </Text>
      {bidding?.currentBidder ? (
        <Text style={styles.bidderName}>
          by {getName?.(bidding.currentBidder) || 'Player'}
        </Text>
      ) : null}

      <View style={[styles.timerPill, isUrgent && styles.timerUrgent]}>
        {!isOpen ? (
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            Bidding opens in {openingInSec}s
          </Text>
        ) : (
          <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
            {expiresInSec === null ? 'Bidding active' : `Time left: ${expiresInSec}s`}
          </Text>
        )}
      </View>

      {canBid ? (
        <>
          <View style={styles.adjustRow}>
            <Pressable
              style={[styles.adjustBtn, amount <= minBid && styles.disabled]}
              disabled={amount <= minBid}
              onPress={() => setAmount((prev) => Math.max(minBid, prev - (bidding?.increment || 5)))}
            >
              <Text style={styles.adjustText}>−</Text>
            </Pressable>
            <Text style={styles.amount}>{amount}</Text>
            <Pressable
              style={[styles.adjustBtn, amount >= maxBid && styles.disabled]}
              disabled={amount >= maxBid}
              onPress={() => setAmount((prev) => Math.min(maxBid, prev + (bidding?.increment || 5)))}
            >
              <Text style={styles.adjustText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.primaryBtn} onPress={() => WsPlaceBid(amount)}>
              <Text style={styles.primaryText}>Bid {amount}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={WsPassBid}>
              <Text style={styles.secondaryText}>Pass</Text>
            </Pressable>
          </View>
        </>
      ) : hasPassed ? (
        <Text style={styles.note}>You passed this round.</Text>
      ) : (
        <Text style={styles.note}>Waiting for bidding window...</Text>
      )}

      {passed.length ? (
        <Text style={styles.noteSmall}>
          Passed: {passed.map((pid) => getName?.(pid) || 'Player').join(', ')}
        </Text>
      ) : null}
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
  bidLabel: {
    ...typography.label,
    color: colors.creamMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: spacing.xs,
  },
  currentBid: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.gold,
    textShadowColor: 'rgba(201, 162, 39, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bidderName: {
    ...typography.captionSmall,
    color: colors.creamMuted,
    fontFamily: fonts.body,
  },
  timerPill: {
    ...pillStyle,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginVertical: spacing.xs,
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
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 60,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  primaryBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    flex: 1,
  },
  primaryText: {
    ...buttonStyles.primaryText,
  },
  secondaryBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
  },
  secondaryText: {
    ...buttonStyles.secondaryText,
  },
  note: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 12,
  },
  noteSmall: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 11,
  },
  disabled: {
    ...buttonStyles.disabled,
  },
});
