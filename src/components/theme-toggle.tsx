import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';
import { useColorMode, useTheme } from '@/hooks/use-theme';

/** One-tap light/dark switch. Overrides "System" in Settings until the user picks System again. */
export function ThemeToggle() {
  const theme = useTheme();
  const mode = useColorMode();
  const { update } = useSettings();
  const next = mode === 'dark' ? 'light' : 'dark';

  return (
    <Pressable
      onPress={() => update({ theme: next })}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${next} mode`}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.icon}>{mode === 'dark' ? '☀️' : '🌙'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20, lineHeight: 26 },
  pressed: { opacity: 0.7 },
});
