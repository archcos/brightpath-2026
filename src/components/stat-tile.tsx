import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing, type ThemeColor } from '@/constants/theme';

type StatTileProps = { icon: string; value: number; label: string; tone?: ThemeColor; onPress?: () => void };

/** A number with a label. With `onPress` it becomes a shortcut to the matching list. */
export function StatTile({ icon, value, label, tone = 'backgroundElement', onPress }: StatTileProps) {
  return (
    <Card tone={tone} style={styles.tile} onPress={onPress} accessibilityLabel={`${value} ${label}`}>
      <View style={styles.top}>
        <ThemedText style={styles.icon}>{icon}</ThemedText>
        {onPress && (
          <ThemedText themeColor="textSecondary" style={styles.chevron}>
            ›
          </ThemedText>
        )}
      </View>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: '45%', minWidth: 140, gap: Spacing.one },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { fontSize: 20 },
  chevron: { fontSize: 20, lineHeight: 22 },
});
