import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';
import { useColorMode, useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/utils/confirm';
import { ROLE_LABEL } from '@/utils/roles';

const PANEL_WIDTH = 320;

/** ☰ button that slides in a panel from the right with who's signed in, theme, settings and sign out. Swipe right to close. */
export function SideMenu() {
  const theme = useTheme();
  const mode = useColorMode();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  // 0 = open, 1 = off screen to the right.
  const [offset] = useState(() => new Animated.Value(1));

  const animateTo = (to: 0 | 1, done?: () => void) => {
    if (settings.reduceMotion) {
      offset.setValue(to);
      done?.();
      return;
    }
    Animated.timing(offset, { toValue: to, duration: 220, useNativeDriver: true }).start(() => done?.());
  };
  const show = () => {
    setOpen(true);
    animateTo(0);
  };
  const hide = (then?: () => void) =>
    animateTo(1, () => {
      setOpen(false);
      then?.();
    });

  const swipe = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_e, g) => offset.setValue(Math.max(0, g.dx) / PANEL_WIDTH),
    onPanResponderRelease: (_e, g) => (g.dx > PANEL_WIDTH / 3 || g.vx > 0.5 ? hide() : animateTo(0)),
    onPanResponderTerminate: () => animateTo(0),
  });

  const confirmSignOut = () =>
    hide(async () => {
      if (await confirmDestructive('Sign out?', 'You will need your password to sign back in.', 'Sign out')) await signOut();
    });

  return (
    <>
      <Pressable
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.icon}>☰</ThemedText>
      </Pressable>

      <Modal visible={open} transparent statusBarTranslucent animationType="none" onRequestClose={() => hide()}>
        <View style={styles.fill}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.scrim, { opacity: offset.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => hide()}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />
          </Animated.View>
          <Animated.View
            {...swipe.panHandlers}
            accessibilityViewIsModal
            style={[
              styles.panel,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                paddingTop: insets.top + Spacing.three,
                paddingBottom: insets.bottom + Spacing.three,
                transform: [{ translateX: offset.interpolate({ inputRange: [0, 1], outputRange: [0, PANEL_WIDTH] }) }],
              },
            ]}>
            <View style={styles.content}>
              <View style={styles.who}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
                  <ThemedText style={styles.avatar}>{user?.avatar}</ThemedText>
                </View>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{user?.displayName}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {user ? ROLE_LABEL[user.role] : ''}
                    {user?.school ? ` • ${user.school.name}` : ''}
                  </ThemedText>
                </View>
              </View>

              <View>
                <ListRow
                  icon={mode === 'dark' ? '☀️' : '🌙'}
                  title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
                  onPress={() => update({ theme: mode === 'dark' ? 'light' : 'dark' })}
                  right={<View />}
                />
                <ListRow icon="⚙️" title="Settings" onPress={() => hide(() => router.push('/settings'))} />
              </View>
            </View>
            <View style={styles.footer}>
              <Button variant="danger" label="Sign out" onPress={confirmSignOut} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
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
  fill: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    width: PANEL_WIDTH,
    maxWidth: '85%',
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  content: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  who: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatarCircle: { width: 52, height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatar: { fontSize: 28, lineHeight: 36 },
  flex: { flex: 1, gap: Spacing.half },
  footer: { paddingHorizontal: Spacing.three },
});
