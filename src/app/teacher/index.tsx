import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StaffHeader } from '@/components/staff-header';
import { SubjectIcon } from '@/components/subject-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { useTeacherActivities, useTeacherClasses, useTeacherLessons } from '@/hooks/teacher-queries';
import { ACTIVITY_TYPE_LABEL, formatLongDate, formatMonthDay, formatTime } from '@/utils/format';

type Tab = 'lessons' | 'activities';

export default function TeacherHome() {
  const [tab, setTab] = useState<Tab>('lessons');
  const classes = useTeacherClasses();
  const lessons = useTeacherLessons();
  const activities = useTeacherActivities();
  const refreshing = classes.isRefetching || lessons.isRefetching || activities.isRefetching;
  const refresh = () => {
    classes.refetch();
    lessons.refetch();
    activities.refetch();
  };
  const hasClasses = (classes.data?.length ?? 0) > 0;

  return (
    <Screen tab refreshing={refreshing} onRefresh={refresh}>
      <StaffHeader title="My Classes" subtitle="Post lesson summaries and activities for your students' families." />

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
                  Grade {c.grade} • {c.section} • {c.studentCount} students
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

      <Chips<Tab>
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
                {l.archived ? (
                  <Badge label="Archived — hidden from parents" tone="warning" />
                ) : (
                  <Badge
                    label={l.summaryStatus === 'ready' ? 'Published' : 'Draft — preparing'}
                    tone={l.summaryStatus === 'ready' ? 'success' : 'neutral'}
                  />
                )}
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
