import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LOW_BATTERY, PendantStatus } from '@/components/pendant-status';
import { StaffHeader } from '@/components/staff-header';
import { SubjectIcon } from '@/components/subject-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { Select } from '@/components/ui/select';
import {
  useAttachRecording,
  useReadTeacherNotification,
  useTeacherActivities,
  useTeacherClasses,
  useTeacherLessons,
  useTeacherNotifications,
  useTeacherPendant,
  useTeacherRecordings,
} from '@/hooks/teacher-queries';
import { errorMessage } from '@/services/api';
import type { TeacherLesson } from '@/types/api';
import { ACTIVITY_TYPE_LABEL, formatLongDate, formatMonthDay, formatRelativeDay, formatTime, plural } from '@/utils/format';

/** "12:00 AM Tomorrow" */
const formatWhen = (at: string) => `${formatTime(at)} ${formatRelativeDay(at)}`;

function lessonBadge(l: TeacherLesson) {
  if (l.archived) return <Badge label="Archived — hidden from parents" tone="warning" />;
  if (l.summaryStatus === 'ready') return <Badge label="Published" tone="success" />;
  if (l.aiDraftAt && l.autoPublishAt) return <Badge label={`AI draft — posts ${formatWhen(l.autoPublishAt)}`} tone="info" />;
  return <Badge label="Draft — preparing" tone="neutral" />;
}

type Tab = 'lessons' | 'activities';

export default function TeacherHome() {
  const [tab, setTab] = useState<Tab>('lessons');
  const classes = useTeacherClasses();
  const lessons = useTeacherLessons();
  const activities = useTeacherActivities();
  const pendant = useTeacherPendant();
  const notifications = useTeacherNotifications();
  const recordings = useTeacherRecordings();
  const readNotification = useReadTeacherNotification();
  const attach = useAttachRecording();
  const refreshing =
    classes.isRefetching || lessons.isRefetching || activities.isRefetching || pendant.isRefetching || notifications.isRefetching;
  const refresh = () => {
    classes.refetch();
    lessons.refetch();
    activities.refetch();
    pendant.refetch();
    notifications.refetch();
    recordings.refetch();
  };
  const hasClasses = (classes.data?.length ?? 0) > 0;
  const unread = notifications.data?.filter((n) => !n.read) ?? [];
  const lessonOptions = (lessons.data ?? [])
    .filter((l) => !l.archived)
    .map((l) => ({ value: String(l.id), label: l.title, description: `${formatLongDate(l.startsAt)} • ${formatTime(l.startsAt)}` }));

  return (
    <Screen tab refreshing={refreshing} onRefresh={refresh}>
      <StaffHeader title="My Classes" subtitle="Post lesson summaries and activities for your students' families." />

      {pendant.data ? (
        <Card tone={pendant.data.battery <= LOW_BATTERY ? 'dangerSoft' : 'backgroundElement'}>
          <PendantStatus pendant={pendant.data} heading="My recording pendant" />
        </Card>
      ) : pendant.data === null ? (
        <Card tone="primarySoft">
          <ThemedText type="smallBold">🎙️ No recording pendant yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your lessons are recorded with a pendant you wear in class. Ask your school admin to give you one.
          </ThemedText>
        </Card>
      ) : null}

      {unread.map((n) => (
        <Card
          key={n.id}
          tone="warningSoft"
          onPress={() => {
            readNotification.mutate(n.id);
            const lessonId = n.link?.match(/^\/teacher\/lesson\/(\d+)$/)?.[1];
            if (lessonId) router.push({ pathname: '/teacher/lesson/[id]', params: { id: lessonId } });
          }}
          accessibilityLabel={`${n.title}. ${n.body}`}>
          <ThemedText type="smallBold">🔔 {n.title}</ThemedText>
          <ThemedText type="small">{n.body}</ThemedText>
        </Card>
      ))}

      {recordings.data?.map((r) => (
        <Card key={r.id} tone="primarySoft">
          <ThemedText type="smallBold">
            🎙️ Recording from {formatLongDate(r.startedAt)} • {formatTime(r.startedAt)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {r.status === 'failed'
              ? `Couldn't be summarized${r.error ? ` (${r.error})` : ''}. Pick its lesson to try again.`
              : 'No lesson matched its time. Pick the lesson it belongs to and an AI summary draft will be made.'}
          </ThemedText>
          <Select
            label="Lesson"
            placeholder="Choose a lesson"
            searchPlaceholder="Search lessons"
            options={lessonOptions}
            value=""
            onChange={(lessonId) => attach.mutate({ id: r.id, lessonId: Number(lessonId) })}
          />
          {attach.error && attach.variables?.id === r.id && (
            <ThemedText type="caption" themeColor="danger">
              {errorMessage(attach.error)}
            </ThemedText>
          )}
        </Card>
      ))}

      {classes.isLoading ? (
        <Loading />
      ) : classes.error ? (
        <ErrorState error={classes.error} onRetry={classes.refetch} />
      ) : !hasClasses ? (
        <EmptyState title="No classes assigned yet" message="An admin needs to assign your sections and subjects." />
      ) : (
        <View style={styles.classes}>
          {classes.data!.map((c) => (
            <Card key={`${c.sectionId}-${c.subject.id}`} style={styles.classCard}>
              <SubjectIcon subject={c.subject} size={36} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">{c.subject.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Grade {c.grade} • {c.section} • {plural(c.studentCount, 'student')}
                </ThemedText>
              </View>
            </Card>
          ))}
        </View>
      )}

      {hasClasses && (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="+ New Lesson" onPress={() => router.push({ pathname: '/teacher/lesson/[id]', params: { id: 'new' } })} />
          </View>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label="+ New Activity"
              onPress={() => router.push({ pathname: '/teacher/activity/[id]', params: { id: 'new' } })}
            />
          </View>
        </View>
      )}

      <Segmented<Tab>
        options={[
          { value: 'lessons', label: `Lessons ${lessons.data?.length ?? ''}` },
          { value: 'activities', label: `Activities ${activities.data?.length ?? ''}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'lessons' ? (
        <Section title="My Lessons">
          {lessons.isLoading ? (
            <Loading />
          ) : !lessons.data?.length ? (
            <EmptyState title="No lessons yet" />
          ) : (
            lessons.data.map((l) => (
              <Card
                key={l.id}
                onPress={() => router.push({ pathname: '/teacher/lesson/[id]', params: { id: String(l.id) } })}
                accessibilityLabel={`Edit lesson ${l.title}`}>
                <ThemedText type="caption" style={{ color: l.subject.color, fontWeight: 700 }}>
                  {l.subject.name} • {l.section}
                </ThemedText>
                <ThemedText type="smallBold">{l.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatLongDate(l.startsAt)} • {formatTime(l.startsAt)} • {l.durationMin} min
                </ThemedText>
                {lessonBadge(l)}
              </Card>
            ))
          )}
        </Section>
      ) : (
        <Section title="My Activities">
          {activities.isLoading ? (
            <Loading />
          ) : !activities.data?.length ? (
            <EmptyState title="No activities yet" />
          ) : (
            activities.data.map((a) => (
              <Card
                key={a.id}
                onPress={() => router.push({ pathname: '/teacher/activity/[id]', params: { id: String(a.id) } })}
                accessibilityLabel={`Edit activity ${a.title}`}>
                <ThemedText type="caption" style={{ color: a.subject.color, fontWeight: 700 }}>
                  {ACTIVITY_TYPE_LABEL[a.type]} • {a.subject.name} • {a.section}
                </ThemedText>
                <ThemedText type="smallBold">{a.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Due {formatMonthDay(a.dueOn)}
                </ThemedText>
                {a.archived && <Badge label="Archived — hidden from parents" tone="warning" />}
              </Card>
            ))
          )}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  classes: { gap: Spacing.two },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
