import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'primary';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme();
  const colors = {
    danger: [theme.dangerSoft, theme.danger],
    warning: [theme.warningSoft, theme.warning],
    success: [theme.successSoft, theme.success],
    info: [theme.infoSoft, theme.info],
    primary: [theme.primarySoft, theme.primary],
    neutral: [theme.backgroundSelected, theme.textSecondary],
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[0] }]}>
      <ThemedText type="caption" style={{ color: colors[1], fontWeight: 600 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half,
  },
});
