import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Cinzel_400Regular,
  Cinzel_500Medium,
  Cinzel_600SemiBold,
  Cinzel_700Bold,
} from '@expo-google-fonts/cinzel';
import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';
import ToastOverlay from '../src/components/shared/ToastOverlay';
import AppLoadingScreen from '../src/components/shared/AppLoadingScreen';
import { AuthProvider } from '../src/hooks/useAuth';
import useAppState from '../src/hooks/useAppState';
import store from '../src/redux/store';
import { colors } from '../src/styles/theme';

// Hand off from the native splash to our JS loading screen as fast as possible
SplashScreen.preventAutoHideAsync();

/** Global foreground handler — reconnects socket & refreshes token */
function AppLifecycleManager() {
  useAppState();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_400Regular,
    Cinzel_500Medium,
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Lato_400Regular,
    Lato_700Bold,
  });

  // Hide the native splash immediately — AppLoadingScreen takes over from here
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <AuthProvider>
            <AppLifecycleManager />
            <StatusBar style="light" />
            <ToastOverlay />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bgDeep },
              }}
            />
            {/* Overlay: studio logo → app title, fades out once fonts are ready */}
            <AppLoadingScreen isReady={fontsLoaded || !!fontError} />
          </AuthProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
