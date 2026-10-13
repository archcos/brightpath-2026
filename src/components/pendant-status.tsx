import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Pendant } from '@/types/api';
import { formatRelativeDay, formatTime } from '@/utils/format';

/** Battery at or below this needs charging before the next class. */
export const LOW_BATTERY = 20;

const batteryColor = (level: number): ThemeColor =>
  level <= LOW_BATTERY ? 'danger' : level <= 50 ? 'warning' : 'success';

/** "Synced today, 9:00 AM", "Synced on October 5, 9:00 AM" or "Never synced". */
export function lastSyncLabel(pendant: Pendant) {
  if (!pendant.lastSyncAt) return 'Never synced';
  const day = formatRelativeDay(pendant.lastSyncAt);
  const when = day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : `on ${day}`;
  return `Synced ${when}, ${formatTime(pendant.lastSyncAt)}`;
}

/** A recording pendant's status: connection, battery and last sync. Shown to its teacher and school admins only. */
export function PendantStatus({ pendant, heading }: { pendant: Pendant; heading?: string }) {
  const theme = useTheme();
  const color = theme[batteryColor(pendant.battery)];
  const low = pendant.battery <= LOW_BATTERY;

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

      <View style={styles.gap}>
        <View style={styles.between}>
          <ThemedText type="smallBold">Battery</ThemedText>
          <ThemedText type="smallBold" style={{ color }}>
            {pendant.battery}%
          </ThemedText>
        </View>
        <View
          style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
          accessibilityRole="progressbar"
          accessibilityLabel="Battery"
          accessibilityValue={{ min: 0, max: 100, now: pendant.battery }}>
          <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, pendant.battery))}%`, backgroundColor: color }]} />
        </View>
        {low && (
          <ThemedText type="caption" themeColor="danger">
            Low battery — charge it before the next class.
          </ThemedText>
        )}
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
  gap: { gap: Spacing.one },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
