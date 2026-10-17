import { StyleSheet, View } from 'react-native';

import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { greeting } from '@/utils/format';

/**
 * Header for teacher, school admin and super admin home screens: a greeting by first name, with the
 * school (or other context) above it. Theme, settings and sign out live in the side menu.
 */
export function StaffHeader({ eyebrow, subtitle }: { eyebrow?: string; subtitle?: string }) {
  const { user } = useAuth();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        {eyebrow && (
          <ThemedText type="label" themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText type="title">
          {greeting()}
          {user ? `, ${user.firstName}` : ''} 👋
        </ThemedText>
        {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
      </View>
      <SideMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.one },
});
