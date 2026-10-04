import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', href: '/', label: 'Home', icon: '🏠' },
  { name: 'lessons', href: '/lessons', label: 'Lessons', icon: '📚' },
  { name: 'activities', href: '/activities', label: 'Activities', icon: '✅' },
  { name: 'calendar', href: '/calendar', label: 'Calendar', icon: '📅' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: '👤' },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <BottomBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: string }) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={[styles.tab, isFocused && { backgroundColor: theme.primarySoft }]}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <ThemedText type="caption" style={{ color: isFocused ? theme.primary : theme.textSecondary }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function BottomBar(props: TabListProps) {
  const theme = useTheme();
  return (
    <View {...props} style={styles.container}>
      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.three,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.one,
    justifyContent: 'space-between',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radius.md, gap: Spacing.half },
  icon: { fontSize: 18, lineHeight: 22 },
});
