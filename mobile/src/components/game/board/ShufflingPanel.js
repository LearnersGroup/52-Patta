import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WsDeal, WsShuffleAction, WsUndoShuffle } from '../../../api/wsEmitters';
import { buttonStyles, colors, fonts, panelStyle, pillStyle, spacing, typography } from '../../../styles/theme';

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
                <Text style={styles.chipText}>{ICONS[op.type]} {LABELS[op.type]}</Text>
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
            <Text style={styles.actionBtnText}>{ICONS[type]} {LABELS[type]}</Text>
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
              <Text style={styles.chipText}>{ICONS[op.type]} {LABELS[op.type]}</Text>
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
    ...panelStyle,
    width: '100%',
    maxWidth: 280,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.subtitle,
    color: colors.cream,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.label,
    color: colors.creamMuted,
    textAlign: 'center',
    fontSize: 11,
  },
  buttonsRow: {
    gap: spacing.xs,
    width: '100%',
  },
  actionBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    paddingVertical: 8,
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
    ...typography.label,
    color: colors.goldLight,
    fontSize: 11,
  },
  undoBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.small,
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
    backgroundColor: colors.bgPanelLight,
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
