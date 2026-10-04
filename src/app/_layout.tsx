import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChildProvider } from '@/context/child-context';
import { SettingsProvider } from '@/context/settings-context';
import { useColorMode, useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Don't retry requests the server has definitively rejected.
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );

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
  const { isLoading, user } = useAuth();
  const mode = useColorMode();
  const theme = useTheme();
  const signedIn = !!user;
  const active = user?.status === 'active';
  // Each role only has its own screens mounted; the server enforces the same rules on every request.
  const isParent = active && user.role === 'parent';
  const isTeacher = active && user.role === 'teacher';
  const isAdmin = active && user.role === 'admin';
  const isSuper = active && user.role === 'super_admin';

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.background, card: theme.background, primary: theme.primary, text: theme.text },
      }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, headerTintColor: theme.primary }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
        </Stack.Protected>

        <Stack.Protected guard={isParent}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson/[slug]" options={{ title: '' }} />
          <Stack.Screen name="activity/[slug]" options={{ title: '' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="notification-settings" options={{ title: 'Notification Settings' }} />
          <Stack.Screen name="weekly" options={{ title: 'Weekly Summary' }} />
          <Stack.Screen name="saved" options={{ title: 'Saved' }} />
          <Stack.Screen name="pendant" options={{ title: 'Teacher Pendant' }} />
          <Stack.Screen name="connect-child" options={{ title: 'Connect a Child', presentation: 'modal' }} />
          <Stack.Screen name="student" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={isTeacher}>
          <Stack.Screen name="teacher/index" options={{ headerShown: false }} />
          <Stack.Screen name="teacher/lesson/[id]" options={{ title: 'Lesson' }} />
          <Stack.Screen name="teacher/activity/[id]" options={{ title: 'Activity' }} />
        </Stack.Protected>

        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin/index" options={{ headerShown: false }} />
          <Stack.Screen name="admin/user/[id]" options={{ title: 'User' }} />
          <Stack.Screen name="admin/new-user" options={{ title: 'New User', presentation: 'modal' }} />
          <Stack.Screen name="admin/new-student" options={{ title: 'New Student', presentation: 'modal' }} />
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
    </ThemeProvider>
  );
}
