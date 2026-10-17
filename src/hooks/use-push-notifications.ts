import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// expo-notifications throws on import when its native code is missing (Expo Go on Android, or an app built before
// it was added), so it's only loaded when present. Without it the app runs normally, just without push.
const hasNativePush = !!requireOptionalNativeModule(
  Platform.OS === 'android' ? 'ExpoTopicSubscriptionModule' : 'ExpoPushTokenManager',
);
if (__DEV__ && !hasNativePush) console.warn('Push disabled: this build has no expo-notifications native code');

/** See push-notifications-impl.ts. */
export const usePushNotifications: () => void = hasNativePush
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./push-notifications-impl').usePushNotifications
  : () => {};
