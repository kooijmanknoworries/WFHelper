import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { LanguageProvider } from '@/context/LanguageContext';
import { FeedbackSettingsProvider } from '@/context/FeedbackSettingsContext';
import { checkDutchDictionaryForUpdates, initializeDutchDictionary } from '@/lib/solver';
import { getDevBackend } from '@/lib/dev-backend';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Development builds may point at a LAN backend over HTTP via
// EXPO_PUBLIC_DEV_BACKEND_URL. Production/Replit builds never set it and keep
// the HTTPS-only EXPO_PUBLIC_DOMAIN behaviour.
const devBackend = getDevBackend();
const apiDomain = devBackend ? null : process.env.EXPO_PUBLIC_DOMAIN;
setBaseUrl(devBackend?.url ?? (apiDomain ? `https://${apiDomain}` : null));

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void initializeDutchDictionary().then(() => checkDutchDictionaryForUpdates());
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <LanguageProvider>
                <FeedbackSettingsProvider>
                  <RootLayoutNav />
                </FeedbackSettingsProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
