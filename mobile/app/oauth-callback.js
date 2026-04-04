import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { normalizeOAuthParams } from '../src/utils/oauth';
import { colors, spacing, typography } from '../src/styles/theme';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login, user } = useAuth();

  useEffect(() => {
    const parsed = normalizeOAuthParams(params || {});

    if (parsed.error) {
      const suffix = parsed.existing_provider
        ? `&existing_provider=${encodeURIComponent(parsed.existing_provider)}`
        : '';
      router.replace(`/login?error=${encodeURIComponent(parsed.error)}${suffix}`);
      return;
    }

    if (parsed.token && parsed.user_name) {
      login({
        token: parsed.token,
        user_name: parsed.user_name,
        needs_onboarding: String(parsed.needs_onboarding || '0') === '1',
        provider: parsed.provider,
      });
      return;
    }

    if (user) {
      router.replace('/');
      return;
    }

    router.replace('/login');
  }, [params, router, user, login]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>OAuth Callback</Text>
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDeep,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    ...typography.heading,
    color: colors.cream,
  },
  text: {
    ...typography.body,
    color: colors.creamMuted,
  },
});
