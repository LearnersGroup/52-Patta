import { Platform, Vibration } from 'react-native';

let ExpoHaptics = null;
try {
  // Optional dependency; falls back to vibration if unavailable.
  // eslint-disable-next-line global-require
  ExpoHaptics = require('expo-haptics');
} catch {
  ExpoHaptics = null;
}

export async function hapticSelection() {
  if (ExpoHaptics?.selectionAsync) {
    await ExpoHaptics.selectionAsync();
    return;
  }
  if (Platform.OS !== 'web') Vibration.vibrate(8);
}

export async function hapticSuccess() {
  if (ExpoHaptics?.notificationAsync && ExpoHaptics?.NotificationFeedbackType?.Success) {
    await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
    return;
  }
  if (Platform.OS !== 'web') Vibration.vibrate([0, 12, 18, 12]);
}

export async function hapticWarning() {
  if (ExpoHaptics?.notificationAsync && ExpoHaptics?.NotificationFeedbackType?.Warning) {
    await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
    return;
  }
  if (Platform.OS !== 'web') Vibration.vibrate(18);
}

export async function hapticHeavy() {
  if (ExpoHaptics?.impactAsync && ExpoHaptics?.ImpactFeedbackStyle?.Heavy) {
    await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
    return;
  }
  if (Platform.OS !== 'web') Vibration.vibrate(30);
}

export function hapticLong() {
  if (Platform.OS !== 'web') Vibration.vibrate(1000);
}
