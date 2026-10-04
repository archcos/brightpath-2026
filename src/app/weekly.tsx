import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StatGrid, StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useWeekly } from '@/hooks/queries';
import { formatMonthDay, formatRelativeDay } from '@/utils/format';

export default function WeeklyScreen() {
  const { child } = useChild();
  const { data, isLoading, error, refetch, isRefetching } = useWeekly();

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Card tone="primarySoft">
        <ThemedText type="label" themeColor="primary">
          Weekly Summary
        </ThemedText>
        <ThemedText type="title">{child?.firstName}&apos;s Week</ThemedText>
        <ThemedText themeColor="textSecondary">
          {formatMonthDay(data.start)} – {formatMonthDay(data.end)}
        </ThemedText>
      </Card>

      <Section title="Learning">
        <StatGrid>
          <StatTile icon="🏫" value={data.stats.lessons} label="Classroom Lessons" />
          <StatTile icon="✨" value={data.stats.summariesAvailable} label="Summaries Available" />
          <StatTile icon="👀" value={data.stats.lessonsReviewed} label="Lessons Reviewed" />
        </StatGrid>
      </Section>

      <Section title="Schoolwork">
        <StatGrid>
          <StatTile icon="📝" value={data.stats.assignments} label="Assignments" />
          <StatTile icon="✅" value={data.stats.completed} label="Completed" />
          <StatTile icon="⏳" value={data.stats.pending} label="Pending" />
        </StatGrid>
      </Section>

      <Section title="Coming Up">
        <Card>
          {data.comingUp.map((a) => (
            <ListRow
              key={a.id}
              title={a.title}
              subtitle={`Due ${formatRelativeDay(a.dueOn)}`}
              onPress={() => router.push({ pathname: '/activity/[slug]', params: { slug: a.slug } })}
            />
          ))}
          <View style={styles.wrap}>
            {data.later.map((l) => (
              <Badge key={l} label={l} tone="neutral" />
            ))}
          </View>
        </Card>
      </Section>

      <Section title={`What ${child?.firstName} Learned This Week`}>
        {data.learned.map((l) => (
          <Card
            key={l.slug}
            onPress={() => router.push({ pathname: '/lesson/[slug]', params: { slug: l.slug } })}
            accessibilityLabel={`${l.subject}: ${l.title}`}>
            <ThemedText type="caption" style={{ color: l.color, fontWeight: 700 }}>
              {l.subject}
            </ThemedText>
            <ThemedText type="smallBold">{l.title}</ThemedText>
          </Card>
        ))}
      </Section>

      {data.tips.length > 0 && (
        <Section title="How You Can Help">
          <Card>
            {data.tips.map((tip, i) => (
              <View key={i} style={styles.tip}>
                <ThemedText type="smallBold" themeColor="primary">
                  {i + 1}
                </ThemedText>
                <ThemedText style={styles.flex}>{tip}</ThemedText>
              </View>
            ))}
          </Card>
          <ThemedText type="caption" themeColor="textSecondary">
            Suggestions are generated from this week&apos;s lessons.
          </ThemedText>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.two },
  tip: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
  flex: { flex: 1 },
});
