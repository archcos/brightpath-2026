import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { ChildSwitcher } from '@/components/child-switcher';
import { LessonCard, LessonRow } from '@/components/lesson-card';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { useOverview } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthDay, greeting } from '@/utils/format';

const NEEDS_ATTENTION_PREVIEW = 3;

export default function HomeScreen() {
  const theme = useTheme();
  const { user: parent } = useAuth();
  const { child } = useChild();
  const { data, isLoading, error, refetch, isRefetching } = useOverview();

  if (!child) {
    return (
      <Screen tab>
        <ThemedText type="title">Welcome, {parent?.displayName} 👋</ThemedText>
        <EmptyState title="No child connected yet" message="Connect your child with the student code from their school." />
        <Button label="Connect a Child" onPress={() => router.push('/connect-child')} />
      </Screen>
    );
  }

  return (
    <Screen tab refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            {greeting()}, {parent?.displayName} 👋
          </ThemedText>
          <ThemedText type="title">
            {data && data.stats.lessonsToday === 0
              ? `Here's how ${child.firstName} is doing.`
              : `Here's what ${child.firstName} learned today.`}
          </ThemedText>
        </View>
        <ThemeToggle />
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${data?.unreadNotifications ?? 0} unread`}
          style={[styles.bell, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText style={styles.bellIcon}>🔔</ThemedText>
          {!!data?.unreadNotifications && (
            <View style={[styles.dot, { backgroundColor: theme.danger }]}>
              <ThemedText type="caption" style={styles.dotText}>
                {data.unreadNotifications}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      <ChildSwitcher />

      <Pressable
        onPress={() => router.push('/lessons')}
        accessibilityRole="search"
        style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText themeColor="textSecondary">🔍  Search your child&apos;s learning…</ThemedText>
      </Pressable>

      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <StatGrid>
            <StatTile
              icon="📘"
              value={data.stats.lessonsToday}
              label="Lessons Today"
              onPress={() => router.navigate('/lessons')}
            />
            <StatTile
              icon="📝"
              value={data.stats.tasksDue}
              label="Tasks Due"
              onPress={() => router.navigate({ pathname: '/activities', params: { state: 'upcoming', group: 'all' } })}
            />
            <StatTile
              icon="🧠"
              value={data.stats.upcomingQuizzes}
              label={data.stats.upcomingQuizzes === 1 ? 'Upcoming Quiz' : 'Upcoming Quizzes'}
              onPress={() => router.navigate({ pathname: '/activities', params: { state: 'upcoming', group: 'quizzes' } })}
            />
            <StatTile
              icon="⚠️"
              value={data.stats.needsAttention}
              label="Needs Attention"
              tone={data.stats.needsAttention ? 'warningSoft' : 'backgroundElement'}
              onPress={() => router.navigate({ pathname: '/activities', params: { state: 'overdue', group: 'all' } })}
            />
          </StatGrid>

          <Section title="Today's Learning" subtitle="See what your child learned in class today.">
            {data.todayLessons.length === 0 ? (
              <EmptyState title="No lessons recorded today" />
            ) : (
              data.todayLessons.map((l) => <LessonCard key={l.id} lesson={l} />)
            )}
          </Section>

          {data.needsAttention.length > 0 && (
            <Section
              title="Needs Attention"
              subtitle="Overdue or due today — a quick check-in at home can help."
              action={
                data.needsAttention.length > NEEDS_ATTENTION_PREVIEW
                  ? {
                      label: `See all ${data.needsAttention.length}`,
                      href: { pathname: '/activities', params: { state: 'overdue', group: 'all' } },
                    }
                  : undefined
              }>
              {/* Show the most urgent few; a long list here would push everything else off screen. */}
              {data.needsAttention.slice(0, NEEDS_ATTENTION_PREVIEW).map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </Section>
          )}

          <Section title="Coming Up" action={{ label: 'View Full Calendar', href: '/calendar' }}>
            {data.comingUp.length === 0 ? (
              <EmptyState title="Nothing coming up" />
            ) : (
              data.comingUp.map((a) => <ActivityCard key={a.id} activity={a} />)
            )}
          </Section>

          {data.nextQuiz && (
            <Section title="Quizzes & Exams">
              <Card tone="primarySoft">
                <ThemedText type="label" themeColor="primary">
                  Upcoming {data.nextQuiz.type}
                </ThemedText>
                <ThemedText type="heading">{data.nextQuiz.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {data.nextQuiz.subject.name} • {formatMonthDay(data.nextQuiz.dueOn)}
                </ThemedText>
                {data.nextQuiz.topics.length > 0 && (
                  <>
                    <ThemedText type="label" themeColor="textSecondary">
                      Topics
                    </ThemedText>
                    <View style={styles.wrap}>
                      {data.nextQuiz.topics.map((t) => (
                        <Badge key={t} label={t} tone="primary" />
                      ))}
                    </View>
                  </>
                )}
                <ThemedText type="small">
                  Suggested review: go over the {data.nextQuiz.subject.name} lessons before{' '}
                  {formatMonthDay(data.nextQuiz.dueOn)}.
                </ThemedText>
                <View style={styles.row}>
                  {data.nextQuiz.lesson && (
                    <Button
                      small
                      variant="secondary"
                      label="View Related Lessons"
                      onPress={() =>
                        router.push({ pathname: '/lesson/[slug]', params: { slug: data.nextQuiz!.lesson!.slug } })
                      }
                    />
                  )}
                  <Button
                    small
                    variant="ghost"
                    label={data.nextQuiz.type === 'exam' ? 'Exam Details' : 'Quiz Details'}
                    onPress={() => router.push({ pathname: '/activity/[slug]', params: { slug: data.nextQuiz!.slug } })}
                  />
                </View>
              </Card>
            </Section>
          )}

          <Section title="Recent Lesson Summaries" action={{ label: 'See All', href: '/lessons' }}>
            {data.recentSummaries.length === 0 ? (
              <EmptyState title="No summaries yet" message="They'll appear here after the teacher publishes them." />
            ) : (
              data.recentSummaries.map((l) => <LessonRow key={l.id} lesson={l} showDate />)
            )}
          </Section>

          <Card onPress={() => router.push('/weekly')} accessibilityLabel={`${child.firstName}'s week`}>
            <ThemedText type="heading">{child.firstName}&apos;s Week</ThemedText>
            <View style={styles.weekRow}>
              <WeekStat value={data.week.lessons} label="Lessons" />
              <WeekStat value={data.week.completed} label="Tasks Done" />
              <WeekStat value={data.week.pending} label="Pending" />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatMonthDay(data.week.start)} – {formatMonthDay(data.week.end)}
            </ThemedText>
          </Card>
        </>
      )}
    </Screen>
  );
}

function WeekStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.weekStat}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.one },
  bell: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { fontSize: 20, lineHeight: 26 },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dotText: { color: '#fff', fontSize: 10, lineHeight: 12 },
  search: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weekStat: { alignItems: 'center' },
});
