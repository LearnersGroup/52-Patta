import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { unlink_provider, update_profile } from '../src/api/apiHandler';
import { useAuth } from '../src/hooks/useAuth';
import { runOAuthSession } from '../src/utils/oauth';
import AppBackground from '../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  inputFocusStyle,
  inputStyle,
  panelStyle,
  spacing,
  typography,
} from '../src/styles/theme';

const PROVIDERS = ['google', 'facebook'];

export default function ProfileScreen() {
  const { user, profile, refreshProfile, updateUserName, logout } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyProvider, setBusyProvider] = useState(null);
  const [status, setStatus] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    setName(profile?.name || user?.user_name || '');
  }, [profile, user]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const onSave = async () => {
    try {
      setSaving(true);
      setStatus(null);
      const payload = {};

      if (name.trim() && name.trim() !== profile?.name) {
        payload.name = name.trim();
      }

      if (!Object.keys(payload).length) {
        setStatus('No profile changes to save');
        return;
      }

      await update_profile(payload);
      updateUserName(name.trim());
      await refreshProfile();
      setStatus('Profile updated');
    } catch (e) {
      setStatus(e?.errors?.[0]?.msg || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const linkedSet = new Set((profile?.linkedProviders || []).map((lp) => lp.provider));

  const disconnectDisabled = (provider) => {
    if (!linkedSet.has(provider)) return true;
    return !profile?.hasPassword && linkedSet.size <= 1;
  };

  const onConnectProvider = async (provider) => {
    try {
      setBusyProvider(provider);
      setStatus(null);

      const result = await runOAuthSession(provider, {
        mode: 'link',
        token: user?.token,
      });

      if (result.type !== 'success') {
        setStatus('Linking cancelled.');
        return;
      }

      if (result.params?.error) {
        setStatus(result.params.error.replaceAll('_', ' '));
        return;
      }

      if (result.params?.linked === provider) {
        await refreshProfile();
        setStatus(`${provider} account connected.`);
      } else {
        setStatus('Provider link completed. Please refresh profile.');
      }
    } catch {
      setStatus('Failed to connect provider.');
    } finally {
      setBusyProvider(null);
    }
  };

  const onDisconnectProvider = async (provider) => {
    try {
      setBusyProvider(provider);
      setStatus(null);
      await unlink_provider(provider);
      await refreshProfile();
      setStatus(`${provider} account disconnected.`);
    } catch (e) {
      setStatus(e?.errors?.[0]?.msg || 'Failed to disconnect provider.');
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <AppBackground>
      {/* ── Header bar ── */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        {/* right ghost keeps title centred */}
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.suitTopLeft}>{'\u2660 \u2665'}</Text>
        <Text style={styles.suitBottomRight}>{'\u2666 \u2663'}</Text>

        <Text style={styles.sectionTitle}>Identity</Text>

        {profile?.avatar ? (
          <View style={styles.avatarPreviewWrap}>
            <SvgUri uri={profile.avatar} width="96" height="96" />
          </View>
        ) : null}

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Display name"
          placeholderTextColor={colors.creamMuted}
          style={[styles.input, focusedField === 'name' && styles.inputFocus]}
          maxLength={50}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
        />

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/avatar-editor')}>
          <Text style={styles.secondaryButtonText}>✦ Edit Avatar</Text>
        </Pressable>

        {status ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, saving && buttonStyles.disabled]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.suitTopLeft}>{'\u2660 \u2665'}</Text>
        <Text style={styles.suitBottomRight}>{'\u2666 \u2663'}</Text>

        <Text style={styles.sectionTitle}>Linked Accounts</Text>
        {PROVIDERS.map((provider) => {
          const connected = linkedSet.has(provider);
          return (
            <View key={provider} style={styles.providerRow}>
              <Text style={styles.providerName}>{provider}</Text>
              {connected ? (
                <Pressable
                  style={[styles.providerButton, styles.disconnectButton]}
                  onPress={() => onDisconnectProvider(provider)}
                  disabled={disconnectDisabled(provider) || busyProvider === provider}
                >
                  <Text style={styles.providerButtonText}>
                    {busyProvider === provider ? 'Working...' : 'Disconnect'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.providerButton, styles.connectButton]}
                  onPress={() => onConnectProvider(provider)}
                  disabled={busyProvider === provider}
                >
                  <Text style={styles.providerButtonText}>
                    {busyProvider === provider ? 'Working...' : 'Connect'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
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
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(201, 162, 39, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // ── Content ─────────────────────────────────────────────────────────────
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    ...panelStyle,
    padding: spacing.lg,
    gap: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  suitTopLeft: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontSize: 28,
    color: colors.gold,
    opacity: 0.12,
  },
  suitBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    fontSize: 28,
    color: colors.gold,
    opacity: 0.12,
  },
  sectionTitle: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
  },
  avatarPreviewWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  input: {
    ...inputStyle,
    fontFamily: fonts.body,
  },
  inputFocus: {
    ...inputFocusStyle,
  },
  statusContainer: {
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: 7,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    color: colors.goldLight,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  secondaryButton: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
    ...buttonStyles.full,
  },
  secondaryButtonText: {
    ...buttonStyles.secondaryText,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  providerName: {
    color: colors.cream,
    textTransform: 'capitalize',
    fontWeight: '600',
    fontFamily: fonts.body,
  },
  providerButton: {
    ...buttonStyles.base,
    ...buttonStyles.small,
  },
  connectButton: {
    ...buttonStyles.primary,
  },
  disconnectButton: {
    backgroundColor: colors.goldDark,
  },
  providerButtonText: {
    ...buttonStyles.primaryText,
    ...buttonStyles.smallText,
  },
  primaryButton: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    ...buttonStyles.full,
  },
  primaryButtonText: {
    ...buttonStyles.primaryText,
  },
  logoutButton: {
    ...buttonStyles.base,
    ...buttonStyles.full,
    backgroundColor: colors.goldDark,
  },
  logoutButtonText: {
    ...buttonStyles.primaryText,
  },
});
