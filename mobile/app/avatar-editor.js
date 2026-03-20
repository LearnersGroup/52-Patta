import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { update_profile } from '../src/api/apiHandler';
import AvatarCreator from '../src/components/auth/AvatarCreator';
import AppBackground from '../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  panelStyle,
  shadows,
  spacing,
  typography,
} from '../src/styles/theme';

export default function AvatarEditorScreen() {
  const { profile, refreshProfile } = useAuth();

  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = useCallback((dataUri) => {
    setPendingAvatar(dataUri);
  }, []);

  const handleSave = async () => {
    if (!pendingAvatar) return;
    setSaving(true);
    setError('');
    try {
      await update_profile({ avatar: pendingAvatar });
      await refreshProfile();
      router.back();
    } catch (err) {
      setError(err?.response?.data?.errors?.[0]?.msg || 'Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBackground style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Edit Avatar</Text>
        <View style={styles.backButton} />
      </View>

      {/* Card container */}
      <View style={styles.card}>
        {/* Corner decorations */}
        <Text style={styles.cornerTL}>♠ ♥</Text>
        <Text style={styles.cornerBR}>♦ ♣</Text>

        <AvatarCreator
          initialAvatar={profile?.avatar || null}
          onAvatarChange={handleAvatarChange}
        />
      </View>

      {/* Error */}
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Save button */}
      <Pressable
        style={[
          styles.saveBtn,
          (!pendingAvatar || saving) && buttonStyles.disabled,
        ]}
        onPress={handleSave}
        disabled={!pendingAvatar || saving}
      >
        {saving
          ? <ActivityIndicator color={colors.buttonText} />
          : <Text style={styles.saveBtnText}>Save Avatar</Text>}
      </Pressable>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },

  // Header row — matches profile screen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,   // page already has paddingHorizontal
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.gold,
    lineHeight: 28,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(201, 162, 39, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Card
  card: {
    ...panelStyle,
    ...shadows.deep,
    flex: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute',
    top: 10,
    left: 12,
    color: colors.gold,
    opacity: 0.12,
    fontSize: 13,
    letterSpacing: 4,
    fontFamily: fonts.heading,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    color: colors.gold,
    opacity: 0.12,
    fontSize: 13,
    letterSpacing: 4,
    fontFamily: fonts.heading,
  },

  // Error
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 7,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: '#ff9090',
    fontSize: 13,
    fontFamily: fonts.body,
  },

  // Save button
  saveBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    ...buttonStyles.full,
    paddingVertical: 14,
  },
  saveBtnText: {
    ...buttonStyles.primaryText,
    fontFamily: fonts.heading,
  },
});
