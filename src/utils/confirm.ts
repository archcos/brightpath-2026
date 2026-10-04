import { Alert, Platform } from 'react-native';

/** Asks the user to confirm a destructive action. Alert.alert has no buttons on web, so use window.confirm there. */
export function confirmDestructive(title: string, message: string, actionLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: actionLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
