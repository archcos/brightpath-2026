import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', label: 'Home', sf: 'house.fill', md: 'home' },
  { name: 'lessons', label: 'Lessons', sf: 'books.vertical.fill', md: 'menu_book' },
  { name: 'activities', label: 'Activities', sf: 'checklist', md: 'checklist' },
  { name: 'calendar', label: 'Calendar', sf: 'calendar', md: 'calendar_month' },
  { name: 'profile', label: 'Profile', sf: 'person.crop.circle', md: 'person' },
] as const;

export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.backgroundElement}
      indicatorColor={theme.primarySoft}
      tintColor={theme.primary}
      labelStyle={{ selected: { color: theme.primary } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
