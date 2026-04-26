import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WsDeal, WsShuffleAction, WsUndoShuffle } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, pillStyle, shadows, spacing, typography } from '../../../styles/theme';

const MAX_SHUFFLE_OPS = 5;

const LABELS = {
  riffle: 'Riffle',
  hindu: 'Hindu',
  overhand: 'Overhand',
};

const ICONS = {
  riffle: '♠',
  hindu: '♥',
  overhand: '♦',
};

export default function ShufflingPanel({
  dealer,
  userId,
  shuffleQueue = [],
  getName,
  currentGameNumber = 1,
  totalGames = 1,
  gameLabel = 'Game',
}) {
  const isDealer = dealer === userId;
  const queueLength = shuffleQueue.length;
  const canShuffle = queueLength < MAX_SHUFFLE_OPS;
  const canDeal = queueLength > 0;

  if (!isDealer) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{getName?.(dealer) || 'Dealer'} is shuffling</Text>
        <Text style={styles.subtitle}>
          {gameLabel} {currentGameNumber}/{totalGames}
        </Text>
        {queueLength ? (
          <View style={styles.queueRow}>
            {shuffleQueue.map((op, idx) => (
              <View key={`${op.type}_${idx}`} style={styles.chip}>
                <Text style={styles.chipText}>{LABELS[op.type]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.waiting}>Waiting for shuffle actions...</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>You are the dealer</Text>
      <Text style={styles.subtitle}>
        {gameLabel} {currentGameNumber}/{totalGames}
      </Text>

      <View style={styles.buttonsRow}>
        {['riffle', 'hindu', 'overhand'].map((type) => (
          <Pressable
            key={type}
            style={[styles.actionBtn, !canShuffle && styles.disabled]}
            disabled={!canShuffle}
            onPress={() => WsShuffleAction(type)}
          >
            <Text style={styles.actionBtnText}>{LABELS[type]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.queueHeader}>
        <Text style={styles.queueTitle}>Queue: {queueLength}/{MAX_SHUFFLE_OPS}</Text>
        <Pressable style={[styles.undoBtn, !queueLength && styles.disabled]} disabled={!queueLength} onPress={WsUndoShuffle}>
          <Text style={styles.undoBtnText}>Undo</Text>
        </Pressable>
      </View>

      <View style={styles.queueRow}>
        {queueLength ? (
          shuffleQueue.map((op, idx) => (
            <View key={`${op.type}_${idx}`} style={styles.chip}>
              <Text style={styles.chipText}>{LABELS[op.type]}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.waiting}>Add at least one shuffle before dealing.</Text>
        )}
      </View>

      <Pressable style={[styles.dealBtn, !canDeal && styles.disabled]} disabled={!canDeal} onPress={WsDeal}>
        <Text style={styles.dealBtnText}>Deal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '90%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgDeep,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.18)',
    padding: spacing.md,
    ...shadows.deep,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.75,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    textAlign: 'center',
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonsRow: {
    gap: spacing.xs,
    width: '100%',
  },
  actionBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
  },
  actionBtnText: {
    ...buttonStyles.secondaryText,
    fontSize: 12,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    width: '100%',
  },
  queueTitle: {
    fontFamily: fonts.body,
    color: colors.goldLight,
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  undoBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.small,
    backgroundColor: colors.bgDeep,
  },
  undoBtnText: {
    ...buttonStyles.secondaryText,
    ...buttonStyles.smallText,
  },
  queueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    width: '100%',
  },
  chip: {
    ...pillStyle,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  chipText: {
    fontFamily: fonts.body,
    color: colors.cream,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  waiting: {
    fontFamily: fonts.body,
    color: colors.creamMuted,
    fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dealBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    width: '100%',
  },
  dealBtnText: {
    ...buttonStyles.primaryText,
  },
  disabled: {
    ...buttonStyles.disabled,
  },
});
