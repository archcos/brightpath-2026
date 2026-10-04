import { router, Stack, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useNotifications, useReadNotifications } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification, NotificationType } from '@/types/api';
import { formatTimeAgo } from '@/utils/format';

const ICON: Record<NotificationType, string> = {
  lesson_summary: '📘',
  new_assignment: '📝',
  due_tomorrow: '⏰',
  overdue: '⚠️',
  quiz_reminder: '🧠',
  exam_reminder: '📚',
  school_event: '🎉',
  assignment_completed: '✅',
  weekly_summary: '📊',
};

// Only follow links that point at known in-app screens.
const SAFE_LINK = /^\/(?:(?:lesson|activity)\/[a-z0-9-]+|weekly)$/;

export default function NotificationsScreen() {
  const theme = useTheme();
  const { child } = useChild();
  const { data, isLoading, error, refetch, isRefetching } = useNotifications();
  const read = useReadNotifications();
  const hasUnread = data?.some((n) => !n.read);

  const open = (n: AppNotification) => {
    if (!n.read) read.mutate(n.id);
    if (n.link && SAFE_LINK.test(n.link)) router.push(n.link as Href);
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Stack.Screen
        options={{
          headerRight: () =>
            hasUnread ? (
              <Pressable onPress={() => read.mutate(undefined)} hitSlop={8} accessibilityRole="button">
                <ThemedText type="link">Mark all as read</ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <ThemedText themeColor="textSecondary">Updates about {child?.firstName}</ThemedText>
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState title="You're all caught up" />
      ) : (
        data.map((n) => (
          <Card
            key={n.id}
            onPress={() => open(n)}
            tone={n.read ? 'backgroundElement' : 'primarySoft'}
            style={styles.row}
            accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}>
            <ThemedText style={styles.icon}>{ICON[n.type]}</ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{n.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {n.body}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {formatTimeAgo(n.createdAt)}
              </ThemedText>
            </View>
            {!n.read && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  flex: { flex: 1, gap: Spacing.half },
  icon: { fontSize: 22, lineHeight: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
