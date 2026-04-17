import { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setAutoplay } from '../../../redux/slices/preferences';
import { colors, fonts, panelStyle, spacing } from '../../../styles/theme';

export default memo(function InGameSettings({ visible, onClose }) {
  const dispatch = useDispatch();
  const autoplay = useSelector((s) => s.preferences.autoplay);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.panel} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Settings</Text>

          <Text style={styles.sectionLabel}>Auto-Play</Text>
          <View style={styles.optionRow}>
            {[{ key: false, label: 'Off' }, { key: true, label: 'On' }].map(({ key, label }) => {
              const active = autoplay === key;
              return (
                <Pressable
                  key={label}
                  style={[styles.optionBtn, active && styles.optionBtnActive]}
                  onPress={() => dispatch(setAutoplay(key))}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    ...panelStyle,
    width: 280,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.goldLight,
    textAlign: 'center',
    letterSpacing: 1,
  },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 11,
    fontWeight: '700',
    color: colors.creamMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
  },
  optionBtnActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201, 162, 39, 0.15)',
  },
  optionText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    fontWeight: '700',
    color: colors.creamMuted,
  },
  optionTextActive: {
    color: colors.goldLight,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGoldBright,
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
  },
  closeBtnText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldLight,
    letterSpacing: 0.5,
  },
});
