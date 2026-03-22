import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';

const USER_STORAGE_KEY = 'user';

const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  Constants.expoConfig?.extra?.wsUrl ||
  'http://localhost:4000';

let authErrorHandler = null;

const readStoredUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const socket = io(WS_URL, {
  autoConnect: false,
  auth: async (cb) => {
    const user = await readStoredUser();
    cb({ token: user?.token || null });
  },
});

socket.on('connect_error', async (err) => {
  const msg = String(err?.message || '').toLowerCase();
  const tokenProblem =
    msg.includes('token expired') || msg.includes('jwt') || msg.includes('token');

  if (!tokenProblem) return;

  await AsyncStorage.removeItem(USER_STORAGE_KEY);
  if (typeof authErrorHandler === 'function') {
    authErrorHandler(err);
  }
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const registerSocketAuthErrorHandler = (handler) => {
  authErrorHandler = handler;
};

export default socket;
