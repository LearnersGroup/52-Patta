import { Link, useLocalSearchParams } from 'expo-router';
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
import Svg, { Path, G, ClipPath, Rect, Defs } from 'react-native-svg';
import { user_login } from '../src/api/apiHandler';
import { useAuth } from '../src/hooks/useAuth';
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
import { runOAuthSession } from '../src/utils/oauth';

// Google "G" logo — official brand colours
function GoogleLogo({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id="gClip">
          <Rect width="24" height="24" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#gClip)">
        <Path d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" fill="#4285F4" />
        <Path d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" fill="#34A853" />
        <Path d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" fill="#FBBC05" />
        <Path d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" fill="#EA4335" />
      </G>
    </Svg>
  );
}

// Facebook "f" logo — official brand colour
function FacebookLogo({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.514c-1.491 0-1.956.932-1.956 1.889v2.261h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
        fill="#ffffff"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(null);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const oauthError =
    params?.error === 'email_exists_different_provider'
      ? `This email is registered with ${String(params?.existing_provider || 'another provider')}.`
      : null;

  const applyOAuthLogin = async (oauthParams) => {
    if (!oauthParams?.token || !oauthParams?.user_name) {
      setError('OAuth login did not return account details.');
      return;
    }

    await login({
      token: oauthParams.token,
      user_name: oauthParams.user_name,
      needs_onboarding: String(oauthParams.needs_onboarding || '0') === '1',
    });
  };

  const onLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await user_login(email, password);
      await login(data);
    } catch (e) {
      const msg = e?.errors?.[0]?.msg || 'Login failed';
      setError(msg);
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
      setError('OAuth login failed. Please try again.');
    } finally {
      setOAuthLoading(null);
    }
  };

  return (
    <AppBackground style={styles.screen}>
      {/* Title — vertically centred between Dynamic Island and the card */}
      <View style={styles.titleArea}>
        <Text style={styles.appTitle}>52 Patta</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.suitTopLeft}>{'\u2660 \u2665'}</Text>
        <Text style={styles.suitBottomRight}>{'\u2666 \u2663'}</Text>

        <Text style={styles.heading}>Sign In</Text>

        <Pressable
          style={[styles.oauthButton, styles.googleButton, !!oauthLoading && buttonStyles.disabled]}
          onPress={() => onOAuth('google')}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'google'
            ? <ActivityIndicator color="#3c4043" />
            : <><GoogleLogo size={20} /><Text style={styles.googleText}>Sign in with Google</Text></>}
        </Pressable>

        <Pressable
          style={[styles.oauthButton, styles.facebookButton, !!oauthLoading && buttonStyles.disabled]}
          onPress={() => onOAuth('facebook')}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'facebook'
            ? <ActivityIndicator color="#ffffff" />
            : <><FacebookLogo size={20} /><Text style={styles.facebookText}>Sign in with Facebook</Text></>}
        </Pressable>

        <Text style={styles.divider}>or use email</Text>

        {/* Email — label hugs its input with tight gap */}
        <View style={styles.fieldGroup}>
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
        </View>

        {/* Password — label hugs its input */}
        <View style={styles.fieldGroup}>
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
        </View>

        {oauthError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{oauthError}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && buttonStyles.disabled]}
          onPress={onLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Link href="/register" style={styles.link}>
          <Text style={styles.linkText}>Create Account</Text>
        </Link>
      </View>

      {/* Bottom spacer — 1.5× bigger than title area, so card sits above centre */}
      <View style={styles.bottomSpacer} />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Title sits centred in the flex space above the card
  titleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    ...panelStyle,
    padding: spacing.lg,
    gap: spacing.md,   // section-level spacing (between OAuth block, divider, field groups, button)
    position: 'relative',
    overflow: 'hidden',
  },

  // Larger bottom spacer pushes card above the vertical midpoint
  bottomSpacer: {
    flex: 1.5,
  },

  // Each label + its input live together with a tight 5 px gap
  fieldGroup: {
    gap: 5,
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
  appTitle: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.gold,
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(201, 162, 39, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginBottom: spacing.xs,
  },
  heading: {
    fontFamily: fonts.headingMedium,   // Cinzel 600 — readable but not overpowering
    fontSize: 13,
    color: colors.creamMuted,
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  label: {
    ...typography.label,
    fontFamily: fonts.heading,
    color: colors.gold,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 7,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  googleText: {
    color: '#3c4043',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    fontWeight: '600',
  },
  facebookText: {
    color: '#ffffff',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    fontWeight: '600',
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
