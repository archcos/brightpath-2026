import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { Activity } from '@/types/api';
import { ACTIVITY_TYPE_LABEL, activityBadge, formatRelativeDay } from '@/utils/format';

export function ActivityCard({ activity }: { activity: Activity }) {
  const badge = activityBadge(activity.state, activity.status);
  return (
    <Card
      onPress={() => router.push({ pathname: '/activity/[slug]', params: { slug: activity.slug } })}
      accessibilityLabel={`${ACTIVITY_TYPE_LABEL[activity.type]}: ${activity.title}, ${badge.label}`}>
      <View style={styles.meta}>
        <ThemedText type="label" themeColor="textSecondary">
          {ACTIVITY_TYPE_LABEL[activity.type]}
        </ThemedText>
        <ThemedText type="caption" style={{ color: activity.subject.color, fontWeight: 700 }}>
          • {activity.subject.name}
        </ThemedText>
      </View>
      <ThemedText type="subtitle">{activity.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {activity.description}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        Assigned {formatRelativeDay(activity.assignedOn)} • Due {formatRelativeDay(activity.dueOn)}
        {activity.teacher ? `\nTeacher: ${activity.teacher}` : ''}
      </ThemedText>
      <View style={styles.badges}>
        <Badge label={badge.label} tone={badge.tone} />
        {activity.reviewSuggested && activity.state !== 'completed' && <Badge label="Review Suggested" tone="primary" />}
      </View>
      {activity.lesson && (
        <ThemedText type="caption" themeColor="primary">
          📘 {activity.lesson.title}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', gap: Spacing.one, alignItems: 'center' },
  badges: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});
