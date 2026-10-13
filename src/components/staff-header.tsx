import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { confirmDestructive } from '@/utils/confirm';
import { ROLE_LABEL } from '@/utils/roles';

/** Header for teacher, school admin and super admin home screens: who's signed in, theme toggle, settings, sign out. */
export function StaffHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, signOut } = useAuth();
  const confirmSignOut = async () => {
    if (await confirmDestructive('Sign out?', 'You will need your password to sign back in.', 'Sign out')) await signOut();
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            {user?.avatar} {user?.displayName} • {user ? ROLE_LABEL[user.role] : ''}
            {user?.school ? ` • ${user.school.name}` : ''}
          </ThemedText>
          <ThemedText type="title">{title}</ThemedText>
          {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
        </View>
        <ThemeToggle />
      </View>
      <View style={styles.row}>
        <Button small variant="secondary" label="⚙️ Settings" onPress={() => router.push('/settings')} />
        <Button small variant="ghost" label="Sign out" onPress={confirmSignOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.one },
});
