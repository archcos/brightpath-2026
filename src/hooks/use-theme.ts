import { Colors, type ThemeColors } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useColorMode(): 'light' | 'dark' {
  const system = useColorScheme();
  const { settings } = useSettings();
  if (settings.theme !== 'system') return settings.theme;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): ThemeColors {
  const mode = useColorMode();
  const { settings } = useSettings();
  const base = Colors[mode];
  if (!settings.highContrast) return base;
  return {
    ...base,
    textSecondary: base.text,
    border: mode === 'dark' ? '#6B7280' : '#4B5563',
  };
}
