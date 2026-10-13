import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { FilterRow, Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useActivities } from '@/hooks/queries';
import type { ActivityGroup, ActivityStateFilter } from '@/services/brightpath';

const GROUPS: { value: ActivityGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
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

const EMPTY_TITLE: Record<ActivityStateFilter, string> = {
  upcoming: 'Nothing coming up',
  completed: 'Nothing completed yet',
  overdue: 'Nothing overdue 🎉',
};

const pick =<T extends string>(options: { value: T }[], value: string | undefined, fallback: T): T =>
  options.find((o) => o.value === value)?.value ?? fallback;

export default function ActivitiesScreen() {
  const { child } = useChild();
  // Filters live in the URL so other screens can link here pre-filtered (e.g. Home → overdue).
  const params = useLocalSearchParams<{ group?: string; state?: string }>();
  const group = pick(GROUPS, params.group, 'all');
  const state = pick(STATES, params.state, 'upcoming');
  const setGroup = (value: ActivityGroup | 'all') => router.setParams({ group: value });
  const setState = (value: ActivityStateFilter) => router.setParams({ state: value });
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
          <StatTile icon="📌" value={data.counts.dueToday} label="Due Today" onPress={() => setState('upcoming')} />
          <StatTile
            icon="⏰"
            value={data.counts.overdue}
            label="Overdue"
            tone={data.counts.overdue ? 'dangerSoft' : undefined}
            onPress={() => setState('overdue')}
          />
          <StatTile icon="🗓️" value={data.counts.upcoming} label="Upcoming" onPress={() => setState('upcoming')} />
          <StatTile icon="✅" value={data.counts.completed} label="Completed" onPress={() => setState('completed')} />
        </StatGrid>
      )}

      <FilterRow>
        <Select compact label="Type" options={GROUPS} value={group} onChange={setGroup} />
        <Select compact label="Status" options={STATES} value={state} onChange={setState} />
      </FilterRow>

      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.activities.length === 0 ? (
        <EmptyState
          title={EMPTY_TITLE[state]}
          message={group === 'all' ? undefined : 'Try "All" to see every kind of activity.'}
        />
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
