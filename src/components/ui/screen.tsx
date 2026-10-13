import { useRef, type PropsWithChildren, type ReactNode, type RefObject } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Space kept between the field being typed in and the top of the keyboard. */
const KEYBOARD_GAP = Spacing.five;

type ScreenProps = PropsWithChildren<{
  /** Tab screens leave room for the tab bar and draw under the status bar themselves. */
  tab?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
}>;

export function Screen({ children, tab, refreshing = false, onRefresh, footer }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const viewport = useRef({ offset: 0, height: 0 });

  /** Scrolls so the focused field sits just above the keyboard (Android; iOS does this natively). */
  const revealFocusedInput = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(
      content,
      (_x, y, _width, height) => {
        const { offset, height: visible } = viewport.current;
        if (y + height + KEYBOARD_GAP > offset + visible) {
          scrollRef.current?.scrollTo({ y: y + height + KEYBOARD_GAP - visible });
        } else if (y - KEYBOARD_GAP < offset) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - KEYBOARD_GAP) });
        }
      },
      () => {},
    );
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;
    const shrank = height < viewport.current.height;
    viewport.current.height = height;
    // The keyboard opened and the visible area got smaller: keep the field being typed in on screen.
    if (Platform.OS === 'android' && shrank && Keyboard.isVisible()) revealFocusedInput();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Android: shrink the screen to the space above the keyboard (works with edge-to-edge too).
          iOS: the ScrollView's automaticallyAdjustKeyboardInsets handles it natively. */}
      <KeyboardAvoidingView style={styles.root} behavior="padding" enabled={Platform.OS === 'android'}>
        <ScrollView
          ref={scrollRef}
          // RN types this as RefObject<View> (non-null), but every ref starts as null.
          innerViewRef={contentRef as RefObject<View>}
          onLayout={onLayout}
          onScroll={(e) => {
            viewport.current.offset = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={32}
          contentInsetAdjustmentBehavior="automatic"
          // Forms: a tap on a button works while the keyboard is open, and dragging dismisses it.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: tab ? insets.top + Spacing.three : Spacing.three,
              paddingBottom: (tab ? BottomTabInset : 0) + insets.bottom + Spacing.five,
            },
          ]}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
});
