import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const apiBase =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'http://localhost:4000/api';

export const backendBase = apiBase.replace(/\/api\/?$/, '');

export const makeOAuthStartUrl = (provider) =>
  `${backendBase}/api/oauth/${provider}`;

export const getOAuthRedirectUri = () =>
  AuthSession.makeRedirectUri({
    path: 'oauth-callback',
    scheme: Constants.expoConfig?.scheme || 'patta52',
  });

const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);

export const normalizeOAuthParams = (params = {}) => ({
  token: normalizeParam(params.token),
  user_name: normalizeParam(params.user_name),
  needs_onboarding: normalizeParam(params.needs_onboarding),
  error: normalizeParam(params.error),
  existing_provider: normalizeParam(params.existing_provider),
  linked: normalizeParam(params.linked),
});

export const parseOAuthUrlParams = (url) => {
  const parsed = Linking.parse(url || '');
  return normalizeOAuthParams(parsed?.queryParams || {});
};

export const runOAuthSession = async (provider, options = {}) => {
  const redirectUri = getOAuthRedirectUri();
  const authUrl = new URL(makeOAuthStartUrl(provider));

  if (options.mode) authUrl.searchParams.set('mode', options.mode);
  if (options.token) authUrl.searchParams.set('token', options.token);

  // Forward-looking: allows backend to support explicit mobile redirect in future.
  authUrl.searchParams.set('redirect_uri', redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);

  if (result.type !== 'success' || !result.url) {
    return { type: result.type };
  }

  return {
    type: 'success',
    url: result.url,
    params: parseOAuthUrlParams(result.url),
  };
};
