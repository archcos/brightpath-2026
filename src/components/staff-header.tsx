import { StyleSheet, View } from 'react-native';

import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Header for teacher, school admin and super admin home screens. Theme, settings and sign out live in the side menu. */
export function StaffHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <ThemedText type="title">{title}</ThemedText>
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
