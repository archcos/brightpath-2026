import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { meApi } from '@/services/brightpath';
import { notificationHref } from '@/utils/notification-link';

// Show pushes as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Asks permission (the OS only prompts once) and sends this device's push token to the server for this session. */
async function register() {
  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
  if (!granted) throw new Error('notification permission not granted');
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId });
  await meApi.pushToken(data);
}

/**
 * Push notifications for the signed-in user: registers the device after each sign-in (tokens belong to a
 * session on the server), refreshes data when a push arrives in the foreground, and opens the right screen
 * (and child) when one is tapped. Mounted once in the root layout through use-push-notifications.ts, which only
 * loads this file when the native module is in the build.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const { selectChild } = useChild();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    // Fails in Expo Go on Android, on simulators and offline; pushes are a bonus, never block the app.
    const retry = () =>
      void register().catch((e) => {
        if (__DEV__) console.warn('Push registration failed:', e instanceof Error ? e.message : e);
      });
    retry();
    const tokenSub = Notifications.addPushTokenListener(retry);
    const receivedSub = Notifications.addNotificationReceivedListener(() => void queryClient.invalidateQueries());
    return () => {
      tokenSub.remove();
      receivedSub.remove();
    };
  }, [userId, queryClient]);

  useEffect(() => {
    // Handle each tap once: the hook keeps returning it until the async clear lands, and selectChild changes identity.
    if (!response || !userId || handled.current === response.notification.request.identifier) return;
    handled.current = response.notification.request.identifier;
    const { link, studentId } = response.notification.request.content.data ?? {};
    if (typeof studentId === 'number') selectChild(studentId);
    const href = notificationHref(typeof link === 'string' ? link : null);
    if (href) router.push(href);
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, userId, selectChild]);
}
