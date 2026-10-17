import { type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { AdminStudent } from '@/types/api';
import { plural, sectionName } from '@/utils/format';

/** A student in a teacher's or school admin's list: class, connected parents and unused codes. Tap to open. */
export function StudentCard({ student: s, onPress, children }: PropsWithChildren<{ student: AdminStudent; onPress: () => void }>) {
  return (
    <Card onPress={onPress} accessibilityLabel={`Open ${s.fullName}, ${plural(s.parents, 'parent')} connected`}>
      <View style={styles.row}>
        <ThemedText style={styles.avatar}>{s.avatar}</ThemedText>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{s.fullName}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {sectionName(s.section.grade, s.section.name)} • {s.section.schoolYear} • ID {s.studentCode}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </View>
      <View style={styles.badges}>
        <Badge label={`${plural(s.parents, 'parent')} connected`} tone={s.parents ? 'success' : 'neutral'} />
        {s.openCodes > 0 && <Badge label={`${plural(s.openCodes, 'unused code')}`} tone="info" />}
        {s.status === 'inactive' && <Badge label="Inactive" tone="warning" />}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  avatar: { fontSize: 26, lineHeight: 34 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
