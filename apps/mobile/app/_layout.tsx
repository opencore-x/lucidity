import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ApiProvider } from '@/providers/ApiProvider';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import Constants from 'expo-constants';
import { ThemeProvider } from 'expo-router/react-navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import { Toast } from '@/components/Toast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import * as Font from 'expo-font';
import { FONT_ASSETS } from '@/lib/fonts';
import { LARGE_TITLE_SCREEN_OPTIONS } from '@/lib/headerConfig';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useQuickActions } from '@/hooks/useQuickActions';
import { GlobalTaskSheet } from '@/components/TaskSheet/GlobalTaskSheet';
import { GlobalProjectSheet } from '@/components/ProjectSheet/GlobalProjectSheet';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  // Keep the native UIKit appearance in lockstep with the in-app theme. NativeWind's
  // setColorScheme only restyles JS surfaces; without this the native root window and
  // native-stack push transitions stay in the system appearance and flash white in
  // dark mode. 'unspecified' defers to the system setting.
  React.useEffect(() => {
    Appearance.setColorScheme(
      colorScheme === 'dark' ? 'dark' : colorScheme === 'light' ? 'light' : 'unspecified'
    );
  }, [colorScheme]);

  React.useEffect(() => {
    Font.loadAsync(FONT_ASSETS).then(() => setFontsLoaded(true));
  }, []);

  React.useEffect(() => {
    requestNotificationPermissions();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider
        publishableKey={Constants.expoConfig?.extra?.clerkPublishableKey}
        tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <ApiProvider>
            <ThemeProvider value={NAV_THEME[colorScheme === 'dark' ? 'dark' : 'light']}>
              <BottomSheetModalProvider>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                <Routes />
                <PortalHost />
                <Toast />
              </BottomSheetModalProvider>
            </ThemeProvider>
          </ApiProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { isSignedIn, isLoaded } = useAuth();

  // Set up quick actions for signed-in users
  useQuickActions();

  React.useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <Stack>
        {/* Screens only shown when the user is NOT signed in */}
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
          <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />
          <Stack.Screen name="(auth)/reset-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
          <Stack.Screen name="(auth)/forgot-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
        </Stack.Protected>

        {/* Screens only shown when the user IS signed in */}
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="project/[id]"
            options={{ ...LARGE_TITLE_SCREEN_OPTIONS, headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="milestone/[id]"
            options={{ ...LARGE_TITLE_SCREEN_OPTIONS, headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="settings"
            options={{ ...LARGE_TITLE_SCREEN_OPTIONS, title: 'Settings', headerBackTitle: 'Back' }}
          />
        </Stack.Protected>

        {/* Screens outside the guards are accessible to everyone (e.g. not found) */}
      </Stack>

      {/* Single global native sheets (replace per-screen mounts) */}
      {isSignedIn && <GlobalTaskSheet />}
      {isSignedIn && <GlobalProjectSheet />}
    </>
  );
}

const SIGN_IN_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign in',
};

const SIGN_UP_SCREEN_OPTIONS = {
  presentation: 'modal',
  title: '',
  headerTransparent: true,
  gestureEnabled: false,
} as const;

const DEFAULT_AUTH_SCREEN_OPTIONS = {
  title: '',
  headerShadowVisible: false,
  headerTransparent: true,
};
