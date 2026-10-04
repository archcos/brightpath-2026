import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';

/** Card showing the child being viewed, with a picker to switch between connected children. */
export function ChildSwitcher() {
  const theme = useTheme();
  const { children } = useAuth();
  const { child, selectChild } = useChild();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  if (!child) return null;

  return (
    <>
      <Card style={styles.card}>
        <ThemedText style={styles.avatar}>{child.avatar}</ThemedText>
        <View style={styles.flex}>
          <ThemedText type="subtitle">
            {child.firstName} {child.lastName}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Grade {child.grade} • Section {child.section}
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

      <Modal visible={open} transparent animationType={settings.reduceMotion ? "none" : "fade"} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close">
          {/* Claims touches so tapping inside the sheet doesn't close it. */}
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="heading">Switch child</ThemedText>
            {children.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => {
                  selectChild(c.id);
                  setOpen(false);
                }}
                style={[styles.option, c.id === child.id && { backgroundColor: theme.primarySoft }]}>
                <ThemedText style={styles.avatarSmall}>{c.avatar}</ThemedText>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">
                    {c.firstName} {c.lastName}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Grade {c.grade} • Section {c.section}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { fontSize: 32, lineHeight: 40 },
  avatarSmall: { fontSize: 24, lineHeight: 32 },
  flex: { flex: 1, gap: Spacing.half },
  switch: { borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: Spacing.four },
  sheet: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two, width: '100%', maxWidth: 420, alignSelf: 'center' },
  option: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', padding: Spacing.two, borderRadius: Radius.md },
});
