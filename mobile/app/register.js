import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { user_register } from '../src/api/apiHandler';
import { useAuth } from '../src/hooks/useAuth';
import { runOAuthSession } from '../src/utils/oauth';
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

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(null);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const applyOAuthLogin = async (oauthParams) => {
    if (!oauthParams?.token || !oauthParams?.user_name) {
      setError('OAuth registration did not return account details.');
      return;
    }

    await login({
      token: oauthParams.token,
      user_name: oauthParams.user_name,
      needs_onboarding: String(oauthParams.needs_onboarding || '0') === '1',
    });
  };

  const onRegister = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await user_register(name, email, password);
      await login(data);
    } catch (e) {
      setError(e?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onOAuth = async (provider) => {
    try {
      setOAuthLoading(provider);
      setError(null);
      const result = await runOAuthSession(provider);

      if (result.type !== 'success') {
        setError('OAuth was cancelled.');
        return;
      }

      if (result.params?.error) {
        setError(result.params.error.replaceAll('_', ' '));
        return;
      }

      await applyOAuthLogin(result.params);
    } catch {
      setError('OAuth registration failed. Please try again.');
    } finally {
      setOAuthLoading(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.suitTopLeft}>{'\u2660 \u2665'}</Text>
        <Text style={styles.suitBottomRight}>{'\u2666 \u2663'}</Text>

        <Text style={styles.heading}>Register</Text>
        <Text style={styles.subtext}>Create your account to join the table.</Text>

        <Pressable
          style={[styles.oauthButton, styles.googleButton]}
          onPress={() => onOAuth('google')}
          disabled={!!oauthLoading}
        >
          <Text style={styles.googleText}>
            {oauthLoading === 'google' ? 'Connecting...' : 'Sign up with Google'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.oauthButton, styles.facebookButton]}
          onPress={() => onOAuth('facebook')}
          disabled={!!oauthLoading}
        >
          <Text style={styles.facebookText}>
            {oauthLoading === 'facebook' ? 'Connecting...' : 'Sign up with Facebook'}
          </Text>
        </Pressable>

        <Text style={styles.divider}>or use email</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (optional)"
          placeholderTextColor={colors.creamMuted}
          style={[styles.input, focusedField === 'name' && styles.inputFocus]}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.creamMuted}
          style={[styles.input, focusedField === 'email' && styles.inputFocus]}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor={colors.creamMuted}
          style={[styles.input, focusedField === 'password' && styles.inputFocus]}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
        />

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && buttonStyles.disabled]}
          onPress={onRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </Link>
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
  oauthButton: {
    ...buttonStyles.base,
  },
  googleButton: {
    backgroundColor: '#ffffff',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  googleText: {
    color: '#3c4043',
    fontWeight: '700',
    fontFamily: fonts.body,
  },
  facebookText: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: fonts.body,
  },
  divider: {
    color: colors.creamMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: fonts.body,
    marginVertical: spacing.xs,
  },
  input: {
    ...inputStyle,
    fontFamily: fonts.body,
  },
  inputFocus: {
    ...inputFocusStyle,
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
  link: {
    alignSelf: 'center',
  },
  linkText: {
    ...buttonStyles.secondaryText,
  },
});
