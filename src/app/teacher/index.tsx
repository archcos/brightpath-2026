import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PendantStatus } from '@/components/pendant-status';
import { StaffHeader } from '@/components/staff-header';
import { StudentCard } from '@/components/student-card';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { Pager } from '@/components/ui/pager';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { FilterRow, Select } from '@/components/ui/select';
import {
  useAttachRecording,
  useCanAddPendantKeys,
  useNewTeacherPendantKey,
  useReadTeacherNotification,
  useTeacherActivities,
  useTeacherClasses,
  useTeacherLessons,
  useTeacherLessonsPage,
  useTeacherNotifications,
  useSectionOptions,
  useTeacherPastClasses,
  useTeacherPendant,
  useTeacherRecordings,
} from '@/hooks/teacher-queries';
import { useRoster } from '@/hooks/roster-queries';
import { useAuth } from '@/context/auth-context';
import { errorMessage } from '@/services/api';
import { classKey as keyOf, classOptions, currentSchoolYear, schoolYears } from '@/utils/classes';
import type { TeacherLesson } from '@/types/api';
import { confirmAction } from '@/utils/confirm';
import { ACTIVITY_TYPE_LABEL, formatLongDate, formatMonthDay, formatTime, plural } from '@/utils/format';
import { notificationHref } from '@/utils/notification-link';

function lessonBadge(l: TeacherLesson) {
  if (l.archived) return <Badge label="Archived — hidden from parents" tone="warning" />;
  if (l.summaryLive) return <Badge label="Live — AI updating" tone="danger" />;
  if (l.summaryStatus === 'ready') return <Badge label="Published" tone="success" />;
  return <Badge label="Draft — preparing" tone="neutral" />;
}

type Tab = 'lessons' | 'activities' | 'students';

export default function TeacherHome() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('lessons');
  // Filters: a school year ('' = the one the teacher teaches in now) and one class in it ("sectionId:subjectId", '' = all).
  const [pickedYear, setPickedYear] = useState('');
  const [classKey, setClassKey] = useState('');
  const classes = useTeacherClasses();
  const pastClasses = useTeacherPastClasses();
  const sectionOptions = useSectionOptions();
  const canAddSection = !!sectionOptions.data?.allowed;
  // Every lesson, for the "attach a recording" picker; the Lessons list below loads page by page.
  const lessons = useTeacherLessons();
  // One page number for the list on screen; it goes back to 1 when the tab, year or class changes.
  const [page, setPage] = useState(1);
  const pendant = useTeacherPendant();
  const notifications = useTeacherNotifications();
  const recordings = useTeacherRecordings();
  const readNotification = useReadTeacherNotification();
  const attach = useAttachRecording();
  const refreshing =
    classes.isRefetching || lessons.isRefetching || pendant.isRefetching || notifications.isRefetching;
  // Classes, lessons, notifications and recordings; the paged lists are refetched with them below.
  const refreshTop = () => {
    classes.refetch();
    lessons.refetch();
    pendant.refetch();
    notifications.refetch();
    recordings.refetch();
  };
  const current = classes.data ?? [];
  const past = pastClasses.data ?? [];
  const hasClasses = current.length > 0;
  // Classes are divided by school year, not grade: a teacher may teach a lower grade next year.
  const thisYear = currentSchoolYear(current, past);
  const year = pickedYear || thisYear;
  const years = schoolYears(current, past);
  const yearClasses = current.filter((c) => c.schoolYear === year);
  const yearPast = past.filter((c) => c.schoolYear === year);
  const grades = [...new Set(yearClasses.map((c) => c.grade))].sort((a, b) => a - b);
  const yearOptions = years.map((y) => ({
    value: y,
    label: y,
    description: y === thisYear && hasClasses ? 'Now' : 'Read-only',
  }));
  const classPicker = [{ value: '', label: 'All classes' }, ...classOptions(yearClasses, yearPast)];
  // Viewing something the teacher can read but no longer change (an earlier year, or an ended class).
  const readOnlyView = classKey ? past.some((c) => keyOf(c) === classKey) : !yearClasses.length;
  const [classSection, classSubject] = classKey.split(':').map(Number);
  // The server filters to the class (or the whole school year) before paging.
  const scope = classKey ? { sectionId: classSection, subjectId: classSubject } : { schoolYear: year };
  const pageOf = (t: Tab) => (tab === t ? page : 1);
  const lessonsPage = useTeacherLessonsPage({ ...scope, page: pageOf('lessons') });
  const activities = useTeacherActivities({ ...scope, page: pageOf('activities') });
  const students = useRoster('teacher', { ...(classKey ? { sectionId: classSection } : { schoolYear: year }), page: pageOf('students') });
  const shownLessons = lessonsPage.data?.lessons ?? [];
  const shownActivities = activities.data?.activities ?? [];
  const shownStudents = students.data?.students ?? [];
  const pickYear = (y: string) => {
    setPickedYear(y);
    setClassKey(''); // classes belong to one school year
    setPage(1);
  };
  const pickClass = (key: string) => {
    setClassKey(key);
    setPage(1);
  };
  const refresh = () => {
    refreshTop();
    lessonsPage.refetch();
    activities.refetch();
    students.refetch();
  };
  // "New" buttons start on the class being viewed, when the teacher can still post to it.
  const presetClass = classKey && current.some((c) => keyOf(c) === classKey) ? classKey : undefined;
  const presetSection = presetClass?.split(':')[0];
  const unread = notifications.data?.filter((n) => !n.read) ?? [];
  const lessonOptions = (lessons.data ?? [])
    .filter((l) => !l.archived)
    .map((l) => ({ value: String(l.id), label: l.title, description: `${formatLongDate(l.startsAt)} • ${formatTime(l.startsAt)}` }));

  return (
    <Screen tab refreshing={refreshing} onRefresh={refresh}>
      <StaffHeader eyebrow={user?.school?.name} subtitle="Here's what's happening in your classes. Post lesson summaries and activities for your students' families." />

      {pendant.data ? (
        <Card>
          <PendantStatus pendant={pendant.data} heading="My recording pendant" />
          <PendantKeyButton code={pendant.data.code} />
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
            const href = notificationHref(n.link);
            if (href) router.push(href);
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

      <Section title="My Classes">
        {classes.isLoading ? (
          <Loading />
        ) : classes.error ? (
          <ErrorState error={classes.error} onRetry={classes.refetch} />
        ) : !hasClasses && !past.length ? (
          <>
            <EmptyState
              title="No classes assigned yet"
              message={canAddSection ? 'Add your section, or ask your school admin to assign your classes.' : 'An admin needs to assign your sections and subjects.'}
            />
            {canAddSection && <Button label="+ Add section" onPress={() => router.push('/teacher/new-section')} />}
          </>
        ) : (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {yearClasses.length
                ? `Teaching ${plural(yearClasses.length, 'class', 'classes')} in ${grades.map((g) => `Grade ${g}`).join(', ')}`
                : year === thisYear
                  ? 'No classes this school year yet — an admin needs to assign your sections.'
                  : `${plural(yearPast.length, 'class', 'classes')} you taught`}
            </ThemedText>
            <FilterRow>
              {years.length > 1 && (
                <Select compact label="School year" options={yearOptions} value={year} onChange={pickYear} searchable={false} />
              )}
              <Select compact label="Class" options={classPicker} value={classKey} onChange={pickClass} searchPlaceholder="Search subject or section" />
            </FilterRow>
            {readOnlyView && (
              <ThemedText type="caption" themeColor="textSecondary">
                {year !== thisYear ? `School year ${year}` : 'This class has ended'}: you can read its lessons and
                activities, but not post or change them.
              </ThemedText>
            )}
            {canAddSection && <Button small variant="secondary" label="+ Add section" onPress={() => router.push('/teacher/new-section')} />}
          </Card>
        )}
      </Section>

      {hasClasses && (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="+ New Lesson" onPress={() => router.push({ pathname: '/teacher/lesson/[id]', params: { id: 'new', ...(presetClass && { classKey: presetClass }) } })} />
          </View>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label="+ New Activity"
              onPress={() => router.push({ pathname: '/teacher/activity/[id]', params: { id: 'new', ...(presetClass && { classKey: presetClass }) } })}
            />
          </View>
        </View>
      )}

      <Segmented<Tab>
        options={[
          { value: 'lessons', label: `Lessons ${lessonsPage.data?.total ?? ''}` },
          { value: 'activities', label: `Activities ${activities.data?.total ?? ''}` },
          { value: 'students', label: `Students ${students.data?.total ?? ''}` },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />

      {tab === 'students' ? (
        <Section title="My Students" subtitle="Give each parent their own one-time code; see who is connected and remove anyone who shouldn't be.">
          {hasClasses && (
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  label="+ Add student"
                  onPress={() => router.push({ pathname: '/teacher/new-student', params: presetSection ? { sectionId: presetSection } : {} })}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  variant="secondary"
                  label="Excel import & codes"
                  onPress={() => router.push({ pathname: '/teacher/student-files', params: presetSection ? { sectionId: presetSection } : {} })}
                />
              </View>
            </View>
          )}
          {readOnlyView ? (
            <EmptyState
              title={year !== thisYear ? `School year ${year}` : 'Class ended'}
              message="Students of classes you no longer teach are looked after by their current teachers and school admin."
            />
          ) : students.isLoading ? (
            <Loading />
          ) : students.error ? (
            <ErrorState error={students.error} onRetry={students.refetch} />
          ) : !shownStudents.length ? (
            <EmptyState title={classKey ? 'No students in this class yet' : 'No students yet'} />
          ) : (
            shownStudents.map((st) => (
              <StudentCard
                key={st.id}
                student={st}
                onPress={() => router.push({ pathname: '/teacher/student/[id]', params: { id: String(st.id) } })}
              />
            ))
          )}
          {!readOnlyView && <Pager data={students.data} onChange={setPage} />}
        </Section>
      ) : tab === 'lessons' ? (
        <Section title="My Lessons">
          {lessonsPage.isLoading ? (
            <Loading />
          ) : lessonsPage.error ? (
            <ErrorState error={lessonsPage.error} onRetry={lessonsPage.refetch} />
          ) : !shownLessons.length ? (
            <EmptyState title={classKey ? 'No lessons for this class yet' : 'No lessons yet'} />
          ) : (
            shownLessons.map((l) => (
              <Card
                key={l.id}
                onPress={() => router.push({ pathname: '/teacher/lesson/[id]', params: { id: String(l.id) } })}
                accessibilityLabel={`Open lesson ${l.title}`}>
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
          <Pager data={lessonsPage.data} onChange={setPage} />
        </Section>
      ) : (
        <Section title="My Activities">
          {activities.isLoading ? (
            <Loading />
          ) : activities.error ? (
            <ErrorState error={activities.error} onRetry={activities.refetch} />
          ) : !shownActivities.length ? (
            <EmptyState title={classKey ? 'No activities for this class yet' : 'No activities yet'} />
          ) : (
            shownActivities.map((a) => (
              <Card
                key={a.id}
                onPress={() => router.push({ pathname: '/teacher/activity/[id]', params: { id: String(a.id) } })}
                accessibilityLabel={`Open activity ${a.title}`}>
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
          <Pager data={activities.data} onChange={setPage} />
        </Section>
      )}
    </Screen>
  );
}

/** Lets the teacher make an upload key for their own pendant, when their school admin allows it. */
function PendantKeyButton({ code }: { code: string }) {
  const { data: allowed } = useCanAddPendantKeys();
  const newKey = useNewTeacherPendantKey();
  // The server returns a key only once; it's kept here until the teacher taps Done.
  const [shownKey, setShownKey] = useState<string>();
  if (!allowed) return null;

  const make = async () => {
    const ok = await confirmAction(
      `New upload key for ${code}?`,
      'The key locks to the first device that uploads with it. Older keys keep working until your school admin revokes them.',
      'New key',
    );
    if (ok) setShownKey((await newKey.mutateAsync().catch(() => undefined))?.deviceKey);
  };

  return shownKey ? (
    <>
      <ThemedText type="code" selectable>
        {shownKey}
      </ThemedText>
      <ThemedText type="caption">
        Copy it into the pendant&apos;s settings now. It won&apos;t be shown again. If it&apos;s lost, make a new one and ask your
        school admin to revoke this one.
      </ThemedText>
      <Button small variant="secondary" label="Done" onPress={() => setShownKey(undefined)} />
    </>
  ) : (
    <>
      {newKey.error && (
        <ThemedText type="caption" themeColor="danger">
          {errorMessage(newKey.error)}
        </ThemedText>
      )}
      <Button small variant="secondary" label="New upload key" onPress={make} loading={newKey.isPending} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: Spacing.half },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
