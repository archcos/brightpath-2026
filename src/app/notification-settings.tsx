import { Switch } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { useNotificationPreferences, useSetNotificationPreference } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import type { NotificationType } from '@/types/api';

const OPTIONS: { type: NotificationType; title: string; subtitle: string }[] = [
  { type: 'lesson_summary', title: 'New Lesson Summary', subtitle: 'When a classroom summary is ready' },
  { type: 'new_assignment', title: 'New Assignment', subtitle: 'When a new task is given' },
  { type: 'due_tomorrow', title: 'Assignment Due Tomorrow', subtitle: "A day before it's due" },
  { type: 'overdue', title: 'Overdue Assignment', subtitle: 'When something is past its due date' },
  { type: 'quiz_reminder', title: 'Quiz Reminder', subtitle: 'Before a quiz' },
  { type: 'exam_reminder', title: 'Exam Reminder', subtitle: 'Before an exam' },
  { type: 'school_event', title: 'School Events', subtitle: 'Activities and school dates' },
  { type: 'assignment_completed', title: 'Assignment Completed', subtitle: 'When your child finishes a task' },
  { type: 'weekly_summary', title: 'Weekly Summary', subtitle: "Your child's week, every Sunday" },
];

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useNotificationPreferences();
  const update = useSetNotificationPreference();

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">Choose which updates about your child you&apos;d like to receive.</ThemedText>
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <Card>
          {OPTIONS.map((o) => (
            <ListRow
              key={o.type}
              title={o.title}
              subtitle={o.subtitle}
              right={
                <Switch
                  value={data[o.type]}
                  onValueChange={(v) => update.mutate({ [o.type]: v })}
                  trackColor={{ true: theme.primary }}
                  accessibilityLabel={o.title}
                />
              }
            />
          ))}
        </Card>
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        Preferences are saved to your account and apply on all your devices.
      </ThemedText>
    </Screen>
  );
}
