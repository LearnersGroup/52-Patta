import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import apiClient from '../api/apiClient';
import { removeAuthToken, setAuthToken } from '../api/apiHandler';
import {
  connectSocket,
  disconnectSocket,
  registerSocketAuthErrorHandler,
} from '../api/socket';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'user';

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;

        if (!mounted) return;

        setUser(parsed);
        if (parsed?.token) {
          setAuthToken(parsed.token);
          connectSocket();
        }
      } catch {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) setIsAuthResolved(true);
      }
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    registerSocketAuthErrorHandler(() => {
      setUser(null);
      setProfile(null);
      removeAuthToken();
      disconnectSocket();
      router.replace('/login');
    });
  }, [router]);

  const persistUser = useCallback(async (nextUser) => {
    if (!nextUser) {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/refresh');
      if (res.data?.refreshed && res.data.token) {
        const newToken = res.data.token;
        setAuthToken(newToken);
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, token: newToken };
          persistUser(next);
          return next;
        });
      }
    } catch {
      // 401 means token already expired — logout
    }
  }, [persistUser]);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth');
      setProfile(res.data);
      return res.data;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  // Eagerly load the profile whenever we have an authenticated user.
  // This handles both cold-start (token restored from AsyncStorage) and
  // fresh login — so the avatar is ready as soon as the home screen mounts.
  useEffect(() => {
    if (user?.token) {
      refreshProfile();
    }
  }, [user?.token, refreshProfile]);

  const login = useCallback(
    async (data) => {
      setUser(data);
      setProfile(null);

      if (data?.token) {
        setAuthToken(data.token);
      }

      await persistUser(data);
      connectSocket();

      if (data?.needs_onboarding) {
        router.replace('/create-user');
        return;
      }

      router.replace('/');
    },
    [persistUser, router]
  );

  const updateUserName = useCallback(
    async (name) => {
      if (!name) return;

      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, user_name: name };
        persistUser(next);
        return next;
      });
    },
    [persistUser]
  );

  const completeOnboarding = useCallback(
    async (name) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          user_name: name || prev.user_name,
          needs_onboarding: false,
        };
        persistUser(next);
        return next;
      });

      // Refresh profile so avatar is available immediately on the home screen
      await refreshProfile();

      router.replace('/');
    },
    [persistUser, refreshProfile, router]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setProfile(null);
    removeAuthToken();
    await persistUser(null);
    disconnectSocket();
    router.replace('/login');
  }, [persistUser, router]);

  const value = useMemo(
    () => ({
      user,
      profile,
      isAuthResolved,
      login,
      logout,
      refreshProfile,
      refreshToken,
      updateUserName,
      completeOnboarding,
    }),
    [
      user,
      profile,
      isAuthResolved,
      login,
      logout,
      refreshProfile,
      refreshToken,
      updateUserName,
      completeOnboarding,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
