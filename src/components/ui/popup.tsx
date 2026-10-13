import { BlurView } from 'expo-blur';
import { type PropsWithChildren } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';
import { useColorMode, useTheme } from '@/hooks/use-theme';

type PopupProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  /** Extra styles for the card (e.g. a max height for long lists). */
  style?: StyleProp<ViewStyle>;
  /** Screen-reader label for the tap-outside-to-close area. */
  closeLabel?: string;
}>;

/**
 * A centered card over a blurred, dimmed screen. iOS and web blur what's behind; Android dims it more
 * strongly instead (its blur only works on views in the same window, and a Modal is a separate window).
 * Tapping outside or the Android back button closes it.
 */
export function Popup({ visible, onClose, style, closeLabel = 'Close', children }: PopupProps) {
  const theme = useTheme();
  const mode = useColorMode();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType={settings.reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}>
      <View style={[styles.fill, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four }]}>
        {Platform.OS !== 'android' && (
          <BlurView intensity={mode === 'dark' ? 60 : 50} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.35)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }, style]}
          accessibilityViewIsModal>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.three },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '100%',
    alignSelf: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    // Lift the card off the blurred background.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
});
