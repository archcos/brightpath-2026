import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Pendant } from '@/types/api';
import { formatRelativeDay, formatTime } from '@/utils/format';

/** "Synced today, 9:00 AM", "Synced on October 5, 9:00 AM" or "Never synced". */
export function lastSyncLabel(pendant: Pendant) {
  if (!pendant.lastSyncAt) return 'Never synced';
  const day = formatRelativeDay(pendant.lastSyncAt);
  const when = day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : `on ${day}`;
  return `Synced ${when}, ${formatTime(pendant.lastSyncAt)}`;
}

/**
 * A recording pendant's status: connection and last sync. Shown to its teacher and school admins only.
 * No battery level: the pendant only reports when it syncs, so a live-looking battery bar would mislead.
 */
export function PendantStatus({ pendant, heading }: { pendant: Pendant; heading?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={styles.iconText}>🎙️</ThemedText>
        </View>
        <View style={styles.flex}>
          {heading && (
            <ThemedText type="label" themeColor="textSecondary">
              {heading}
            </ThemedText>
          )}
          <ThemedText type="subtitle">{pendant.code}</ThemedText>
        </View>
        <Badge label={pendant.online ? 'Connected' : 'Offline'} tone={pendant.online ? 'success' : 'neutral'} />
      </View>

      <ThemedText type="caption" themeColor="textSecondary">
        {lastSyncLabel(pendant)} • {pendant.connection} • firmware {pendant.firmware}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22, lineHeight: 28 },
});
