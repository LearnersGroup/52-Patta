import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AvatarCreator from '../src/components/auth/AvatarCreator';
import { update_profile } from '../src/api/apiHandler';
import { useAuth } from '../src/hooks/useAuth';
import AppBackground from '../src/components/shared/AppBackground';
import {
  buttonStyles,
  colors,
  fonts,
  inputFocusStyle,
  inputStyle,
  spacing,
  typography,
} from '../src/styles/theme';

const NAME_ADJECTIVES = ['Lucky','Royal','Swift','Mighty','Golden','Bold','Fierce','Epic','Clever','Turbo'];
const NAME_NOUNS = ['Ace','Raja','Falcon','Tiger','Jack','Queen','Wizard','Player','Patta','Champion'];

const hashSeed = (value) => {
  const source = String(value || 'seed');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const generateNameFromSeed = (seedValue) => {
  const hash = hashSeed(seedValue || `${Date.now()}`);
  const adjective = NAME_ADJECTIVES[hash % NAME_ADJECTIVES.length];
  const noun = NAME_NOUNS[(hash * 7) % NAME_NOUNS.length];
  const suffix = (hash % 900) + 100;
  return `${adjective}${noun}${suffix}`;
};

export default function CreateUserScreen() {
  const { user, profile, refreshProfile, completeOnboarding } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [seed, setSeed] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  useEffect(() => {
    if (!profile) return;
    if (profile.avatar) setAvatar(profile.avatar);
    if (!nameTouched && !name && profile.name) setName(profile.name);
  }, [name, nameTouched, profile]);

  useEffect(() => {
    if (nameTouched || name || !seed) return;
    setName(generateNameFromSeed(seed));
  }, [name, nameTouched, seed]);

  const needsOnboarding = useMemo(() => {
    if (!user?.user_name) return true;
    if (profile) return !!profile.needsOnboarding;
    return !!user?.needs_onboarding;
  }, [profile, user?.needs_onboarding, user?.user_name]);

  const handleAvatarChange = useCallback((dataUri) => { setAvatar(dataUri); }, []);
  const handleSeedChange = useCallback((s) => { setSeed(s); }, []);

  if (!user) return <Redirect href="/login" />;
  if (!needsOnboarding) return <Redirect href="/" />;

  const onRandomName = () => {
    setNameTouched(true);
    setName(generateNameFromSeed(seed || `${Date.now()}`));
  };

  const onContinue = async () => {
    if (!name?.trim()) {
      setError('Please enter a display name to continue.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = { name: name.trim() };
      if (typeof avatar === 'string' && avatar.startsWith('data:image/svg+xml')) {
        payload.avatar = avatar;
      }
      await update_profile(payload);
      await completeOnboarding(name.trim());
    } catch (e) {
      setError(e?.errors?.[0]?.msg || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBackground style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Create Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Username row */}
      <View style={styles.nameSection}>
        <Text style={styles.label}>Display Name</Text>
        <View style={styles.nameRow}>
          <TextInput
            value={name}
            onChangeText={(v) => { setNameTouched(true); setName(v); }}
            placeholder="Choose your display name"
            placeholderTextColor={colors.creamMuted}
            style={[styles.input, styles.nameInput, focusedField === 'name' && styles.inputFocus]}
            maxLength={50}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
          <Pressable style={styles.randomBtn} onPress={onRandomName}>
            <Text style={styles.randomBtnText}>Random</Text>
          </Pressable>
        </View>
      </View>

      {/* Avatar creator — fills remaining space */}
      <View style={styles.card}>
        <Text style={styles.cornerTL}>♠ ♥</Text>
        <Text style={styles.cornerBR}>♦ ♣</Text>
        <AvatarCreator
          initialAvatar={profile?.avatar || ''}
          onAvatarChange={handleAvatarChange}
          onSeedChange={handleSeedChange}
        />
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Continue button */}
      <Pressable
        style={[styles.continueBtn, saving && buttonStyles.disabled]}
        onPress={onContinue}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={colors.buttonText} />
          : <Text style={styles.continueBtnText}>Continue to Lobby</Text>}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
    marginBottom: spacing.md,
  },
  headerSpacer: { width: 40 },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(201, 162, 39, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Username section
  nameSection: {
    gap: 5,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: { flex: 1 },
  input: {
    ...inputStyle,
    fontFamily: fonts.body,
  },
  inputFocus: { ...inputFocusStyle },
  randomBtn: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
  },
  randomBtnText: { ...buttonStyles.secondaryText },

  // Avatar card
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 12,
    backgroundColor: colors.bgPanel,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute', top: 10, left: 12,
    color: colors.gold, opacity: 0.12,
    fontSize: 13, letterSpacing: 4,
    fontFamily: fonts.heading,
  },
  cornerBR: {
    position: 'absolute', bottom: 10, right: 12,
    color: colors.gold, opacity: 0.12,
    fontSize: 13, letterSpacing: 4,
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

  // Continue button
  continueBtn: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    ...buttonStyles.full,
    paddingVertical: 14,
  },
  continueBtnText: {
    ...buttonStyles.primaryText,
    fontFamily: fonts.heading,
  },
});
