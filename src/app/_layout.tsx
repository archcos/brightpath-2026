import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmHost } from '@/components/ui/confirm-host';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChildProvider } from '@/context/child-context';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useColorMode, useTheme } from '@/hooks/use-theme';
import { API_ORIGIN, ApiError } from '@/services/api';

SplashScreen.preventAutoHideAsync();

// Don't retry requests the server has definitively rejected, or ones dropped because the user signed out.
const shouldRetry = (count: number, error: Error) =>
  !(error instanceof ApiError && ((error.status >= 400 && error.status < 500) || error.code === 'stale_session')) &&
  count < 2;

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: shouldRetry },
        },
      }),
  );

  // React Query refetches stale data on window focus; on native, "focus" is the app returning to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <ChildProvider>
            <RootNavigator />
          </ChildProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { isLoading, user, connectionError } = useAuth();
  const { settings } = useSettings();
  const mode = useColorMode();
  const theme = useTheme();
  const signedIn = !!user;
  // Teachers and school admins of a deactivated school are treated like pending accounts (the server blocks them too).
  const active = user?.status === 'active' && user.school?.active !== false;
  // Each role only has its own screens mounted; the server enforces the same rules on every request.
  const isParent = active && user.role === 'parent';
  const isTeacher = active && user.role === 'teacher';
  const isAdmin = active && user.role === 'admin';
  const isSuper = active && user.role === 'super_admin';
  usePushNotifications();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  // The root view (native) / page body (web) shows through during screen transitions.
  // Keep it on the theme background so dark mode never flashes white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background);
    if (Platform.OS === 'web') {
      document.documentElement.style.backgroundColor = theme.background;
      document.body.style.backgroundColor = theme.background;
      document.documentElement.style.colorScheme = mode;
    }
  }, [theme.background, mode]);

  if (isLoading) return <View style={[styles.fill, { backgroundColor: theme.background }]} />;
  if (connectionError && !signedIn) return <ConnectionErrorScreen message={connectionError} />;

  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.background, card: theme.background, primary: theme.primary, text: theme.text },
      }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
          // Every screen (including loading states) sits on the theme color, never the default white.
          contentStyle: { backgroundColor: theme.background },
          // "Reduce Animations" in Settings turns off slide/fade transitions.
          animation: settings.reduceMotion ? 'none' : 'default',
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
        </Stack.Protected>

        <Stack.Protected guard={isParent}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson/[slug]" options={{ title: '' }} />
          <Stack.Screen name="activity/[slug]" options={{ title: '' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="notification-settings" options={{ title: 'Notification Settings' }} />
          <Stack.Screen name="weekly" options={{ title: 'Weekly Summary' }} />
          <Stack.Screen name="saved" options={{ title: 'Saved' }} />
          <Stack.Screen name="connect-child" options={{ title: 'Connect a Child', presentation: 'modal' }} />
          <Stack.Screen name="student" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={isTeacher}>
          <Stack.Screen name="teacher/index" options={{ headerShown: false }} />
          <Stack.Screen name="teacher/lesson/[id]" options={{ title: 'Lesson' }} />
          <Stack.Screen name="teacher/activity/[id]" options={{ title: 'Activity' }} />
          <Stack.Screen name="teacher/student/[id]" options={{ title: 'Student' }} />
          <Stack.Screen name="teacher/new-student" options={{ title: 'New Student' }} />
          <Stack.Screen name="teacher/new-section" options={{ title: 'New Section' }} />
          <Stack.Screen name="teacher/student-files" options={{ title: 'Excel import & codes' }} />
        </Stack.Protected>

        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/user/[id]" options={{ title: 'User' }} />
          <Stack.Screen name="admin/new-user" options={{ title: 'New User', presentation: 'modal' }} />
          {/* Not a native modal: it asks for confirmation, and the confirm popup can't show over one on iOS. */}
          <Stack.Screen name="admin/new-student" options={{ title: 'New Student' }} />
          <Stack.Screen name="admin/student/[id]" options={{ title: 'Student' }} />
          <Stack.Screen name="admin/student-files" options={{ title: 'Excel import & codes' }} />
        </Stack.Protected>

        <Stack.Protected guard={isSuper}>
          <Stack.Screen name="super/index" options={{ headerShown: false }} />
          <Stack.Screen name="super/user/[id]" options={{ title: 'User' }} />
          <Stack.Screen name="super/new-user" options={{ title: 'New Account', presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !active}>
          <Stack.Screen name="pending" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack.Protected>
      </Stack>
      </View>
      <ConfirmHost />
    </ThemeProvider>
  );
}

/** Shown when a saved session couldn't be checked because the server is unreachable. The session is kept. */
function ConnectionErrorScreen({ message }: { message: string }) {
  const { retry, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const mode = useColorMode();

  const tryAgain = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Screen tab>
        <View style={styles.hero}>
          <ThemedText style={styles.icon}>📡</ThemedText>
          <ThemedText type="title" style={styles.center}>
            Can&apos;t connect right now
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {message} You&apos;re still signed in — we&apos;ll pick up where you left off once you&apos;re back online.
          </ThemedText>
        </View>
        <Button label="Try again" onPress={tryAgain} loading={retrying} />
        <Button variant="ghost" label="Sign out" onPress={signOut} />
        {__DEV__ && (
          <Card>
            <ThemedText type="caption" themeColor="textSecondary">
              Developer info: the app is calling {API_ORIGIN}. Make sure the API is running and reachable from this
              device (set EXPO_PUBLIC_API_URL in app/.env to override).
            </ThemedText>
          </Card>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.six },
  icon: { fontSize: 56, lineHeight: 68 },
  center: { textAlign: 'center' },
});
