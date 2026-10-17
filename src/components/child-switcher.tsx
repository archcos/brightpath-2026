import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Popup } from '@/components/ui/popup';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { useTheme } from '@/hooks/use-theme';
import { sectionName } from '@/utils/format';

/** Card showing the child being viewed, with a picker to switch between connected children. */
export function ChildSwitcher() {
  const theme = useTheme();
  const { children } = useAuth();
  const { child, selectChild } = useChild();
  const [open, setOpen] = useState(false);
  if (!child) return null;

  return (
    <>
      <Card style={styles.card}>
        <ThemedText style={styles.avatar}>{child.avatar}</ThemedText>
        <View style={styles.flex}>
          <ThemedText type="subtitle">
            {child.fullName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {sectionName(child.grade, child.section)}
          </ThemedText>
        </View>
        {children.length > 1 && (
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Switch child"
            style={[styles.switch, { backgroundColor: theme.primarySoft }]}>
            <ThemedText type="caption" themeColor="textSecondary">
              VIEWING
            </ThemedText>
            <ThemedText type="smallBold" themeColor="primary">
              {child.firstName} ▾
            </ThemedText>
          </Pressable>
        )}
      </Card>

      <Popup visible={open} onClose={() => setOpen(false)}>
        <ThemedText type="heading">Switch child</ThemedText>
        {children.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: c.id === child.id }}
            onPress={() => {
              selectChild(c.id);
              setOpen(false);
            }}
            style={({ pressed }) => [
              styles.option,
              c.id === child.id && { backgroundColor: theme.primarySoft },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.avatarSmall}>{c.avatar}</ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {c.fullName}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {sectionName(c.grade, c.section)}
              </ThemedText>
            </View>
            {c.id === child.id && <ThemedText themeColor="primary">✓</ThemedText>}
          </Pressable>
        ))}
      </Popup>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { fontSize: 32, lineHeight: 40 },
  avatarSmall: { fontSize: 24, lineHeight: 32 },
  flex: { flex: 1, gap: Spacing.half },
  switch: { borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center' },
  option: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', padding: Spacing.two, borderRadius: Radius.md },
  pressed: { opacity: 0.7 },
});
