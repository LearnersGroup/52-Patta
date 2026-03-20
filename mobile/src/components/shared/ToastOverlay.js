import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';
import { removeAlert } from '../../redux/slices/alert';
import { colors, spacing } from '../../styles/theme';

const toneByType = {
  success: '#7ef29d',
  danger: colors.redSuit,
  warning: colors.goldLight,
  info: colors.cream,
};

function ToastItem({ alert, onClose, index }) {
  const y = useSharedValue(-24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [opacity, y]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, animStyle, index > 0 && styles.stacked]}> 
      <View style={[styles.accent, { backgroundColor: toneByType[alert?.alertType] || colors.goldLight }]} />
      <View style={styles.body}>
        <Text style={styles.msg}>{alert?.msg || 'Notification'}</Text>
      </View>
      <Pressable onPress={() => onClose(alert?.id)} hitSlop={8} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ToastOverlay() {
  const dispatch = useDispatch();
  const alerts = useSelector((state) => state.alert.alerts || []);

  if (!alerts.length) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.stack}>
        {alerts.slice(-3).map((alert, i) => (
          <ToastItem
            key={alert.id || `${alert.msg}_${i}`}
            alert={alert}
            index={i}
            onClose={(id) => {
              if (!id) return;
              dispatch(removeAlert(id));
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  stack: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stacked: {
    opacity: 0.93,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  msg: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  closeText: {
    color: colors.creamMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
