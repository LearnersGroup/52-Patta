import { memo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { buttonStyles, colors, fonts, panelStyle, spacing } from '../../styles/theme';

/**
 * Modal prompt shown when the current player is void in the led suit
 * and may optionally reveal the band hukum hidden trump.
 * "Play without revealing" dismisses the prompt locally.
 */
const RevealTrumpPrompt = memo(({ onReveal }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => setDismissed(true)}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.message}>
            You have no cards in the led suit.{'\n'}Reveal the hidden trump?
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={[buttonStyles.base, buttonStyles.primary, styles.btn]}
              onPress={() => {
                setDismissed(true);
                onReveal?.();
              }}
            >
              <Text style={buttonStyles.primaryText}>Reveal Trump</Text>
            </Pressable>
            <Pressable
              style={[buttonStyles.base, buttonStyles.secondary, styles.btn]}
              onPress={() => setDismissed(true)}
            >
              <Text style={buttonStyles.secondaryText}>Play without revealing</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

RevealTrumpPrompt.displayName = 'RevealTrumpPrompt';
export default RevealTrumpPrompt;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    ...panelStyle,
    width: '85%',
    maxWidth: 320,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  message: {
    color: colors.cream,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  btn: {
    width: '100%',
  },
});
