import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, pillStyle, spacing, typography } from '../../../styles/theme';

export default function TeamScoreHUD({
  trumpText,
  roundText,
  onShowScoreboard,
  isAdmin = false,
  onQuit,
}) {
  return (
    <View style={styles.row}>
      {isAdmin && onQuit ? (
        <Pressable style={styles.quitBtn} onPress={onQuit}>
          <Text style={styles.quitText}>✕ Quit</Text>
        </Pressable>
      ) : null}

      {trumpText ? (
        <View style={styles.pill}>
          <Text style={styles.pillValue}>{trumpText}</Text>
        </View>
      ) : null}

      {roundText ? (
        <View style={styles.pill}>
          <Text style={styles.pillValue}>{roundText}</Text>
        </View>
      ) : null}

      <Pressable style={styles.scoreboardBtn} onPress={onShowScoreboard}>
        <Text style={styles.scoreboardText}>⊞</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    ...pillStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillValue: {
    ...typography.captionSmall,
    color: colors.goldLight,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  scoreboardBtn: {
    ...pillStyle,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreboardText: {
    fontSize: 16,
    color: colors.goldLight,
    lineHeight: 20,
  },

  quitBtn: {
    ...pillStyle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderColor: 'rgba(204, 41, 54, 0.5)',
    backgroundColor: 'rgba(204, 41, 54, 0.08)',
  },
  quitText: {
    fontFamily: fonts.heading,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.redSuit,
  },
});
