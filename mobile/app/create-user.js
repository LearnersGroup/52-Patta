import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AvatarCreator from '../src/components/auth/AvatarCreator';
import { update_profile } from '../src/api/apiHandler';
import { useAuth } from '../src/hooks/useAuth';
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

const NAME_ADJECTIVES = [
  'Lucky',
  'Royal',
  'Swift',
  'Mighty',
  'Golden',
  'Bold',
  'Fierce',
  'Epic',
  'Clever',
  'Turbo',
];

const NAME_NOUNS = [
  'Ace',
  'Raja',
  'Falcon',
  'Tiger',
  'Jack',
  'Queen',
  'Wizard',
  'Player',
  'Patta',
  'Champion',
];

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
  const [name, setName] = useState(user?.user_name || '');
  const [avatar, setAvatar] = useState('');
  const [seed, setSeed] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

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
    // Keep user on this page if they have no username yet, regardless of the flag
    if (!user?.user_name) return true;
    if (profile) return !!profile.needsOnboarding;
    return !!user?.needs_onboarding;
  }, [profile, user?.needs_onboarding, user?.user_name]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!needsOnboarding) {
    return <Redirect href="/" />;
  }

  const onRandomName = () => {
    setNameTouched(true);
    setName(generateNameFromSeed(seed || `${Date.now()}`));
  };

  const onContinue = async () => {
    if (!name?.trim()) {
      setError('Please enter a name to continue.');
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
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.suitTopLeft}>{'\u2660 \u2665'}</Text>
        <Text style={styles.suitBottomRight}>{'\u2666 \u2663'}</Text>

        <Text style={styles.heading}>Create Username</Text>
        <Text style={styles.subtext}>Finish your profile before entering the lobby.</Text>

        <Text style={styles.label}>Display Name</Text>
        <View style={styles.randomNameRow}>
          <TextInput
            value={name}
            onChangeText={(value) => {
              setNameTouched(true);
              setName(value);
            }}
            placeholder="Choose your display name"
            placeholderTextColor={colors.creamMuted}
            style={[styles.input, styles.grow, focusedField === 'name' && styles.inputFocus]}
            maxLength={50}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />
          <Pressable style={styles.secondaryButton} onPress={onRandomName}>
            <Text style={styles.secondaryButtonText}>Random</Text>
          </Pressable>
        </View>

        <AvatarCreator
          initialAvatar={profile?.avatar || ''}
          onAvatarChange={setAvatar}
          onSeedChange={setSeed}
        />

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, saving && buttonStyles.disabled]}
          onPress={onContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue to Lobby</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    ...panelStyle,
    padding: spacing.lg,
    gap: spacing.md,
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
  heading: {
    ...typography.heading,
    fontFamily: fonts.heading,
    color: colors.gold,
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(201, 162, 39, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtext: {
    ...typography.bodySmall,
    fontFamily: fonts.body,
    color: colors.creamMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
  },
  randomNameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  grow: {
    flex: 1,
  },
  input: {
    ...inputStyle,
    fontFamily: fonts.body,
  },
  inputFocus: {
    ...inputFocusStyle,
  },
  secondaryButton: {
    ...buttonStyles.base,
    ...buttonStyles.secondary,
  },
  secondaryButtonText: {
    ...buttonStyles.secondaryText,
  },
  errorContainer: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 7,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: colors.redSuit,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  primaryButton: {
    ...buttonStyles.base,
    ...buttonStyles.primary,
    ...buttonStyles.full,
  },
  primaryButtonText: {
    ...buttonStyles.primaryText,
  },
});
