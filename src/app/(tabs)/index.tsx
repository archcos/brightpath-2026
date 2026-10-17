import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { ChildSwitcher } from '@/components/child-switcher';
import { LessonRow } from '@/components/lesson-card';
import { StatGrid, StatTile } from '@/components/stat-tile';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { useOverview } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { greeting } from '@/utils/format';

/** Home is a glance: the full lists live in the Lessons, Activities and Calendar tabs. */
const PREVIEW = 2;

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
            {greeting()}, {parent?.displayName}
          </ThemedText>
          <ThemedText type="title">{child.firstName}&apos;s day</ThemedText>
        </View>
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
          </StatGrid>

          {data.needsAttention.length > 0 && (
            <Section
              title="Needs Attention"
              action={
                data.needsAttention.length > PREVIEW
                  ? {
                      label: `See all ${data.needsAttention.length}`,
                      href: { pathname: '/activities', params: { state: 'overdue', group: 'all' } },
                    }
                  : undefined
              }>
              {data.needsAttention.slice(0, PREVIEW).map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </Section>
          )}

          <Section title="Today's Learning" action={{ label: 'See All', href: '/lessons' }}>
            {data.todayLessons.length === 0 ? (
              <EmptyState title="No lessons recorded today" />
            ) : (
              data.todayLessons.map((l) => <LessonRow key={l.id} lesson={l} />)
            )}
          </Section>
        </>
      )}
    </Screen>
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
});
