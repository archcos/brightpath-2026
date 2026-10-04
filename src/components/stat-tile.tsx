import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing, type ThemeColor } from '@/constants/theme';

type StatTileProps = { icon: string; value: number; label: string; tone?: ThemeColor };

export function StatTile({ icon, value, label, tone = 'backgroundElement' }: StatTileProps) {
  return (
    <Card tone={tone} style={styles.tile} accessibilityLabel={`${value} ${label}`}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
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
  icon: { fontSize: 20 },
});
