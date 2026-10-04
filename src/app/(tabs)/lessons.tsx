import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { LessonRow } from '@/components/lesson-card';
import { ThemedText } from '@/components/themed-text';
import { Chips } from '@/components/ui/chips';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useChildProfile, useLessons } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { LessonRange } from '@/services/brightpath';
import type { Lesson } from '@/types/api';
import { formatLongDate, formatRelativeDay } from '@/utils/format';

const RANGES: { value: LessonRange; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

export default function LessonsScreen() {
  const theme = useTheme();
  const [subject, setSubject] = useState('all');
  const [range, setRange] = useState<LessonRange>('week');
  const [search, setSearch] = useState('');
  const profile = useChildProfile();
  const { data, isLoading, error, refetch, isRefetching } = useLessons({
    subject: subject === 'all' ? undefined : subject,
    range,
  });

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (data ?? []).filter(
      (l) =>
        !term ||
        [l.title, l.subject.name, l.teacher].some((v) => v.toLowerCase().includes(term)),
    );
    const byDay = new Map<string, Lesson[]>();
    for (const l of filtered) {
      const day = l.startsAt.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), l]);
    }
    return [...byDay.entries()];
  }, [data, search]);

  const subjects = [
    { value: 'all', label: 'All subjects' },
    ...(profile.data?.subjects ?? []).map((s) => ({ value: s.code, label: s.name })),
  ];

  return (
    <Screen tab refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.gap}>
        <ThemedText type="title">Lessons</ThemedText>
        <ThemedText themeColor="textSecondary">Every classroom lesson, summarized for you.</ThemedText>
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="🔍  Search lessons, subjects, teachers…"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Search lessons"
        style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />
      <Chips options={subjects} value={subject} onChange={setSubject} />
      <Chips options={RANGES} value={range} onChange={setRange} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : groups.length === 0 ? (
        <EmptyState title="No lessons found" message="Try another subject or date range." />
      ) : (
        groups.map(([day, lessons]) => (
          <View key={day} style={styles.gap}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {formatRelativeDay(day)} • {formatLongDate(day)}
            </ThemedText>
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two },
  search: { minHeight: 48, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, fontSize: 16 },
});
