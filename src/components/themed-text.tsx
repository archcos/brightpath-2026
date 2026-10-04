import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { TEXT_SCALE, useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'heading' | 'subtitle' | 'small' | 'smallBold' | 'caption' | 'label' | 'link' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const base: TextStyle = styles[type];
  const scale = TEXT_SCALE[settings.textSize];

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'link' ? 'primary' : 'text')] },
        base,
        scale !== 1 && {
          fontSize: (base.fontSize ?? 16) * scale,
          lineHeight: base.lineHeight ? base.lineHeight * scale : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: 600 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' },
  link: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
  code: { fontFamily: Fonts.mono, fontWeight: Platform.select({ android: 700 }) ?? 500, fontSize: 12 },
});
