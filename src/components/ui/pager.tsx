import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import type { Paged } from '@/types/api';

/**
 * Previous / "Page 2 of 5" / Next under a paged list (10 rows a page from the server).
 * Hidden when everything fits on one page.
 */
export function Pager({ data, onChange }: { data: Paged | undefined; onChange: (page: number) => void }) {
  if (!data || data.total <= data.pageSize) return null;
  const pages = Math.ceil(data.total / data.pageSize);
  const { page } = data;
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <Button small variant="secondary" label="‹ Previous" onPress={() => onChange(page - 1)} disabled={page <= 1} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary" accessibilityLiveRegion="polite">
        Page {page} of {pages}
      </ThemedText>
      <View style={styles.side}>
        <Button small variant="secondary" label="Next ›" onPress={() => onChange(page + 1)} disabled={page >= pages} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  side: { flex: 1, maxWidth: 140 },
});
