import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error | null; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <ThemedText type="subtitle">Something went wrong</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {error?.message ?? 'Please try again.'}
      </ThemedText>
      {onRetry && <Button label="Try again" variant="secondary" small onPress={onRetry} />}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.center}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
          {message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: Spacing.five, alignItems: 'center', gap: Spacing.two },
  text: { textAlign: 'center' },
});
