import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useCalendar } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarEntry } from '@/types/api';
import { ACTIVITY_TYPE_LABEL, activityBadge, formatLongDate, formatTime, parseDate, toISODate } from '@/utils/format';

type CalendarMode = 'month' | 'week' | 'agenda';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const theme = useTheme();
  const { child } = useChild();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const month = selected.slice(0, 7);
  const { data, isLoading, error, refetch, isRefetching } = useCalendar(month);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of data ?? []) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [data]);

  const shiftMonth = (delta: number) => {
    const d = parseDate(`${month}-01`);
    d.setMonth(d.getMonth() + delta);
    setSelected(toISODate(d));
  };

  const monthDate = parseDate(`${month}-01`);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(monthDate.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];

  const weekDays = useMemo(() => {
    const start = parseDate(selected);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toISODate(d);
    });
  }, [selected]);

  const today = toISODate(new Date());

  return (
    <Screen tab refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.gap}>
        <ThemedText type="title">Calendar</ThemedText>
        <ThemedText themeColor="textSecondary">Lessons, due dates and school events for {child?.firstName}.</ThemedText>
      </View>

      <Chips
        options={[
          { value: 'month', label: 'Month' },
          { value: 'week', label: 'Week' },
          { value: 'agenda', label: 'Agenda' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <View style={styles.monthNav}>
        <Pressable onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month" hitSlop={12}>
          <ThemedText type="heading" themeColor="primary">‹</ThemedText>
        </Pressable>
        <ThemedText type="heading">
          {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </ThemedText>
        <Pressable onPress={() => shiftMonth(1)} accessibilityLabel="Next month" hitSlop={12}>
          <ThemedText type="heading" themeColor="primary">›</ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : mode === 'month' ? (
        <>
          <Card>
            <View style={styles.grid}>
              {WEEKDAYS.map((d, i) => (
                <ThemedText key={i} type="caption" themeColor="textSecondary" style={styles.cellLabel}>
                  {d}
                </ThemedText>
              ))}
              {cells.map((date, i) =>
                date ? (
                  <Pressable
                    key={date}
                    onPress={() => setSelected(date)}
                    accessibilityLabel={`${formatLongDate(date)}, ${byDate.get(date)?.length ?? 0} entries`}
                    style={[
                      styles.cell,
                      date === today && { backgroundColor: theme.primarySoft },
                      date === selected && { backgroundColor: theme.primary },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: date === selected ? theme.onPrimary : theme.text }}>
                      {Number(date.slice(8))}
                    </ThemedText>
                    <View style={styles.dots}>
                      {(byDate.get(date) ?? []).slice(0, 3).map((e, j) => (
                        <View key={j} style={[styles.dot, { backgroundColor: e.subject.color }]} />
                      ))}
                    </View>
                  </Pressable>
                ) : (
                  <View key={`blank-${i}`} style={styles.cell} />
                ),
              )}
            </View>
          </Card>
          <DayEntries date={selected} entries={byDate.get(selected) ?? []} />
          <ThemedText type="caption" themeColor="textSecondary">
            {data?.length ?? 0} entries this month
          </ThemedText>
        </>
      ) : mode === 'week' ? (
        weekDays.map((d) => <DayEntries key={d} date={d} entries={byDate.get(d) ?? []} compact />)
      ) : [...byDate.keys()].length === 0 ? (
        <EmptyState title="Nothing scheduled this month" />
      ) : (
        [...byDate.keys()].sort().map((d) => <DayEntries key={d} date={d} entries={byDate.get(d)!} />)
      )}
    </Screen>
  );
}

function DayEntries({ date, entries, compact }: { date: string; entries: CalendarEntry[]; compact?: boolean }) {
  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {formatLongDate(date)}
      </ThemedText>
      {entries.length === 0 ? (
        !compact && <EmptyState title="Nothing scheduled" />
      ) : (
        entries.map((e) => <EntryCard key={`${e.kind}-${e.slug}`} entry={e} />)
      )}
    </View>
  );
}

function EntryCard({ entry }: { entry: CalendarEntry }) {
  const open = () =>
    entry.kind === 'lesson'
      ? router.push({ pathname: '/lesson/[slug]', params: { slug: entry.slug } })
      : router.push({ pathname: '/activity/[slug]', params: { slug: entry.slug } });
  const label =
    entry.kind === 'lesson' ? `Lesson • ${formatTime(`${entry.date} ${entry.time}:00`)}` : ACTIVITY_TYPE_LABEL[entry.type];
  const badge = entry.kind === 'activity' ? activityBadge(entry.state, 'not_started') : null;

  return (
    <Card onPress={open} style={styles.entry} accessibilityLabel={`${label}: ${entry.title}`}>
      <View style={[styles.bar, { backgroundColor: entry.subject.color }]} />
      <View style={styles.flex}>
        <ThemedText type="label" style={{ color: entry.subject.color }}>
          {label} • {entry.subject.name}
        </ThemedText>
        <ThemedText type="smallBold">{entry.title}</ThemedText>
        {badge && <Badge label={badge.label} tone={badge.tone} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.one },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellLabel: { width: `${100 / 7}%`, textAlign: 'center', paddingBottom: Spacing.two },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    gap: 2,
  },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  entry: { flexDirection: 'row', gap: Spacing.three },
  bar: { width: 4, borderRadius: 2 },
});
