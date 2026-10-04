import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useActivity, useSetActivityStatus, useToggleSaved } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityStatus } from '@/types/api';
import { ACTIVITY_TYPE_LABEL, STATUS_LABEL, activityBadge, formatLongDate, formatTime } from '@/utils/format';

const STATUSES: ActivityStatus[] = ['not_started', 'in_progress', 'completed'];

export default function ActivityScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: activity, isLoading, error, refetch } = useActivity(slug);
  const setStatus = useSetActivityStatus();
  const toggleSaved = useToggleSaved();

  if (isLoading) return <Loading />;
  if (error || !activity) return <ErrorState error={error} onRetry={refetch} />;

  const badge = activityBadge(activity.state, activity.status);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={activity.saved ? 'Remove from saved' : 'Save activity'}
              onPress={() => toggleSaved.mutate({ type: 'activity', itemId: activity.id, saved: activity.saved })}>
              <ThemedText style={styles.headerIcon}>{activity.saved ? '🔖' : '📑'}</ThemedText>
            </Pressable>
          ),
        }}
      />

      <View style={styles.gap}>
        <ThemedText type="label" themeColor="textSecondary">
          {ACTIVITY_TYPE_LABEL[activity.type]}
        </ThemedText>
        <ThemedText type="caption" style={{ color: activity.subject.color, fontWeight: 700 }}>
          {activity.subject.name}
        </ThemedText>
        <ThemedText type="title">{activity.title}</ThemedText>
        <Badge label={badge.label} tone={badge.tone} />
      </View>

      <Card>
        <View style={styles.facts}>
          <Fact label={activity.isEvent ? 'Date' : 'Due Date'} value={formatLongDate(activity.dueOn)} />
          <Fact label="Assigned" value={formatLongDate(activity.assignedOn)} />
          {activity.teacher && <Fact label="Teacher" value={activity.teacher} />}
          <Fact label="Subject" value={activity.subject.name} />
        </View>
      </Card>

      <Card>
        <ThemedText type="subtitle">What it is</ThemedText>
        <ThemedText>{activity.description}</ThemedText>
        {activity.instructions && (
          <>
            <ThemedText type="subtitle">Instructions</ThemedText>
            <ThemedText>{activity.instructions}</ThemedText>
          </>
        )}
        {activity.topics.length > 0 && (
          <>
            <ThemedText type="subtitle">Topics</ThemedText>
            <View style={styles.wrap}>
              {activity.topics.map((t) => (
                <Badge key={t} label={t} tone="primary" />
              ))}
            </View>
          </>
        )}
      </Card>

      {activity.lesson && (
        <Card>
          <ThemedText type="subtitle">Related Lesson</ThemedText>
          <ThemedText type="smallBold">{activity.lesson.title}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {activity.subject.name} • {formatTime(activity.lesson.startsAt)}
          </ThemedText>
          <Button
            variant="secondary"
            label="Open Lesson Summary"
            onPress={() => router.push({ pathname: '/lesson/[slug]', params: { slug: activity.lesson!.slug } })}
          />
        </Card>
      )}

      {!activity.isEvent && (
        <Card>
          <ThemedText type="subtitle">Status</ThemedText>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {STATUSES.map((s) => {
              const active = activity.status === s;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active, disabled: setStatus.isPending }}
                  disabled={setStatus.isPending}
                  onPress={() => setStatus.mutate({ slug: activity.slug, status: s })}
                  style={[
                    styles.segmentItem,
                    { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: active ? theme.onPrimary : theme.text }}>
                    {STATUS_LABEL[s]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {setStatus.error && (
            <ThemedText type="caption" themeColor="danger">
              {setStatus.error.message}
            </ThemedText>
          )}
        </Card>
      )}

      <ThemedText type="caption" themeColor="textSecondary">
        Parents can view assignments and activities, but only the teacher can change the original instructions or due
        dates.
      </ThemedText>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText type="label" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  fact: { width: '50%', gap: Spacing.half, paddingRight: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  segment: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  segmentItem: {
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
  },
  headerIcon: { fontSize: 22, lineHeight: 28 },
});
