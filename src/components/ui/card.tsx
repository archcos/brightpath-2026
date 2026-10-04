import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  onPress?: () => void;
  tone?: ThemeColor;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ onPress, tone = 'backgroundElement', style, children, accessibilityLabel, ...rest }: CardProps) {
  const theme = useTheme();
  const cardStyle = [styles.card, { backgroundColor: theme[tone], borderColor: theme.border }, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pressed: { opacity: 0.75 },
});
