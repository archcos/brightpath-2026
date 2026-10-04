import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827',
    textSecondary: '#6B7280',
    background: '#F7F7FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF0FF',
    border: '#E8E8EF',
    primary: '#3730A3',
    primarySoft: '#EEF0FF',
    onPrimary: '#FFFFFF',
    success: '#15803D',
    successSoft: '#DCFCE7',
    warning: '#B45309',
    warningSoft: '#FEF3C7',
    danger: '#B91C1C',
    dangerSoft: '#FEE2E2',
    info: '#7C3AED',
    infoSoft: '#F3E8FF',
  },
  dark: {
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    background: '#0B0B12',
    backgroundElement: '#17171F',
    backgroundSelected: '#25254A',
    border: '#2A2A35',
    primary: '#A5B4FC',
    primarySoft: '#25254A',
    onPrimary: '#111827',
    success: '#4ADE80',
    successSoft: '#14331F',
    warning: '#FBBF24',
    warningSoft: '#3A2A0A',
    danger: '#F87171',
    dangerSoft: '#3B1414',
    info: '#C4B5FD',
    infoSoft: '#2A1F45',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 96 }) ?? 0;
export const MaxContentWidth = 800;
