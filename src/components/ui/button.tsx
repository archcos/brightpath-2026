import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, small }: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.onPrimary },
    secondary: { bg: theme.primarySoft, fg: theme.primary },
    ghost: { bg: 'transparent', fg: theme.primary },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
  }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: palette.bg },
        (pressed || inactive) && styles.dim,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <ThemedText type="smallBold" style={{ color: palette.fg }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: Spacing.three },
  dim: { opacity: 0.6 },
});
