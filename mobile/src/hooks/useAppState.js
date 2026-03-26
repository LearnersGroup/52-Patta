import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { connectSocket, socket } from '../api/socket';
import { useAuth } from './useAuth';

/**
 * Manages app lifecycle transitions (background → foreground).
 * On foreground:
 *  1. Reconnects the socket if disconnected
 *  2. Silently refreshes the JWT if it's close to expiry
 *  3. Calls the optional `onForeground` callback so each screen
 *     can trigger its own state re-sync
 */
export default function useAppState({ onForeground } = {}) {
  const appState = useRef(AppState.currentState);
  const { refreshToken } = useAuth();
  const onForegroundRef = useRef(onForeground);
  onForegroundRef.current = onForeground;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const isActive = nextAppState === 'active';

      if (wasBackground && isActive) {
        // Reconnect socket if it dropped while backgrounded
        if (!socket.connected) {
          connectSocket();
        }

        // Silently refresh token if close to expiry
        refreshToken?.();

        // Let the consuming screen re-sync its own state
        onForegroundRef.current?.();
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshToken]);
}
