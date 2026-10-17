import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Popup } from '@/components/ui/popup';
import { Spacing } from '@/constants/theme';
import { confirmStore } from '@/utils/confirm';

/**
 * Draws the dialogs asked for with `confirmDestructive` / `confirmAction`, in the app's own theme.
 * Mounted once in the root layout.
 * shortcut: on iOS a root-level Modal can't show over a native `presentation: 'modal'` screen; none of
 * those screens ask for confirmation today. If one ever does, mount another ConfirmHost inside it.
 */
export function ConfirmHost() {
  const { open, request } = useSyncExternalStore(confirmStore.subscribe, confirmStore.get, confirmStore.get);
  if (!request) return null;

  return (
    <Popup visible={open} onClose={() => confirmStore.settle(false)} closeLabel="Cancel">
      <ThemedText type="heading" accessibilityRole="header">
        {request.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{request.message}</ThemedText>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button variant="secondary" label="Cancel" onPress={() => confirmStore.settle(false)} />
        </View>
        <View style={styles.flex}>
          <Button
            variant={request.tone === 'danger' ? 'danger' : 'primary'}
            label={request.actionLabel}
            onPress={() => confirmStore.settle(true)}
          />
        </View>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  flex: { flex: 1 },
});
