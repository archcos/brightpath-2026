import { router, type Href } from 'expo-router';
import { type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type SectionProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: { label: string; href: Href };
}>;

export function Section({ title, subtitle, action, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <ThemedText type="heading">{title}</ThemedText>
          {subtitle && (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {action && (
          <Pressable onPress={() => router.push(action.href)} accessibilityRole="link" hitSlop={8}>
            <ThemedText type="link">{action.label}</ThemedText>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  titles: { flex: 1, gap: Spacing.half },
});
