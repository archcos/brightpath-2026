import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Chips } from '@/components/ui/chips';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useActivities } from '@/hooks/queries';
import type { ActivityGroup, ActivityStateFilter } from '@/services/brightpath';

const GROUPS: { value: ActivityGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'assignments', label: 'Assignments' },
  { value: 'homework', label: 'Homework' },
  { value: 'quizzes', label: 'Quizzes' },
  { value: 'exams', label: 'Exams' },
  { value: 'projects', label: 'Projects' },
  { value: 'events', label: 'Events' },
];

const STATES: { value: ActivityStateFilter; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

export default function ActivitiesScreen() {
  const { child } = useChild();
  const [group, setGroup] = useState<ActivityGroup | 'all'>('all');
  const [state, setState] = useState<ActivityStateFilter>('upcoming');
  const { data, isLoading, error, refetch, isRefetching } = useActivities({
    group: group === 'all' ? undefined : group,
    state,
  });

  return (
    <Screen tab refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.gap}>
        <ThemedText type="title">Activities</ThemedText>
        <ThemedText themeColor="textSecondary">
          Assignments, quizzes, projects and school dates for {child?.firstName}.
        </ThemedText>
      </View>

      {data && (
        <StatGrid>
          <StatTile icon="📌" value={data.counts.dueToday} label="Due Today" />
          <StatTile icon="⏰" value={data.counts.overdue} label="Overdue" tone={data.counts.overdue ? 'dangerSoft' : undefined} />
          <StatTile icon="🗓️" value={data.counts.upcoming} label="Upcoming" />
          <StatTile icon="✅" value={data.counts.completed} label="Completed" />
        </StatGrid>
      )}

      <Chips options={GROUPS} value={group} onChange={setGroup} />
      <Chips options={STATES} value={state} onChange={setState} />

      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.activities.length === 0 ? (
        <EmptyState title="Nothing here" message="No activities match these filters." />
      ) : (
        data.activities.map((a) => <ActivityCard key={a.id} activity={a} />)
      )}

      <ThemedText type="caption" themeColor="textSecondary">
        Parents can mark an activity as done or in progress. Teachers own the original instructions and due dates.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: Spacing.two } });
