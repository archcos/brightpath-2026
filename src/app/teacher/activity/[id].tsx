import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { ListRow } from '@/components/ui/list-row';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  useArchiveActivity,
  useSaveActivity,
  useTeacherActivity,
  useTeacherClasses,
  useTeacherLessons,
} from '@/hooks/teacher-queries';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import type { ActivityInput, ActivityType, ClassAssignment, TeacherActivityDetail } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { ACTIVITY_TYPE_LABEL, formatLongDate, toISODate } from '@/utils/format';

type Form = {
  classKey: string;
  type: ActivityType;
  title: string;
  description: string;
  instructions: string;
  assignedOn: string;
  dueOn: string;
  lessonId: string;
  topics: string;
  reviewSuggested: boolean;
};

const today = toISODate(new Date());
// Return to the dashboard even when the editor was opened directly (e.g. by URL on web).
const leave = () => (router.canGoBack() ? router.back() : router.replace('/teacher' as Href));

const EMPTY: Form = {
  classKey: '',
  type: 'homework',
  title: '',
  description: '',
  instructions: '',
  assignedOn: today,
  dueOn: today,
  lessonId: 'none',
  topics: '',
  reviewSuggested: false,
};

const TYPES = Object.entries(ACTIVITY_TYPE_LABEL).map(([value, label]) => ({ value: value as ActivityType, label }));

/** Loads the activity (when editing), then mounts the form with its initial values. */
export default function ActivityEditor() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = idParam === 'new' ? null : Number(idParam);
  const classes = useTeacherClasses();
  const existing = useTeacherActivity(id);

  if (classes.isLoading || (id && existing.isLoading)) return <Loading />;
  if (existing.error) return <ErrorState error={existing.error} onRetry={existing.refetch} />;

  const a = existing.data;
  const first = classes.data?.[0];
  const initial: Form = a
    ? {
        classKey: `${a.sectionId}:${a.subject.id}`,
        type: a.type,
        title: a.title,
        description: a.description,
        instructions: a.instructions ?? '',
        assignedOn: a.assignedOn,
        dueOn: a.dueOn,
        lessonId: a.lessonId ? String(a.lessonId) : 'none',
        topics: a.topics.join(', '),
        reviewSuggested: a.reviewSuggested,
      }
    : { ...EMPTY, classKey: first ? `${first.sectionId}:${first.subject.id}` : '' };

  return (
    <ActivityForm
      key={id ?? 'new'}
      id={id}
      initial={initial}
      classes={classes.data ?? []}
      progress={a?.progress}
      archived={a?.archived ?? false}
    />
  );
}

type ActivityFormProps = {
  id: number | null;
  initial: Form;
  classes: ClassAssignment[];
  progress?: TeacherActivityDetail['progress'];
  archived: boolean;
};

function ActivityForm({ id, initial, classes, progress, archived }: ActivityFormProps) {
  const theme = useTheme();
  const lessons = useTeacherLessons();
  const save = useSaveActivity();
  const archive = useArchiveActivity();
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState<string>();

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [sectionId, subjectId] = form.classKey.split(':').map(Number);
  // Only lessons from the same class can be linked (the server enforces the same rule).
  const classLessons = (lessons.data ?? []).filter((l) => l.sectionId === sectionId && l.subject.id === subjectId);

  const submit = async () => {
    setError(undefined);
    const input: ActivityInput = {
      sectionId,
      subjectId,
      lessonId: form.lessonId === 'none' ? null : Number(form.lessonId),
      type: form.type,
      title: form.title,
      description: form.description,
      instructions: form.instructions,
      assignedOn: form.assignedOn.trim(),
      dueOn: form.dueOn.trim(),
      reviewSuggested: form.reviewSuggested,
      topics: form.topics.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      await save.mutateAsync({ id, input });
      leave();
    } catch (e) {
      setError(e instanceof ApiError && e.details ? e.details.map((d) => `${d.field}: ${d.message}`).join('\n') : (e as Error).message);
    }
  };

  // Activities are never deleted: archiving hides them from parents and can be undone.
  const toggleArchive = async () => {
    if (!id) return;
    if (!archived && !(await confirmDestructive('Archive activity?', 'Parents will no longer see it. You can restore it later.', 'Archive'))) {
      return;
    }
    await archive.mutateAsync({ id, archived: !archived });
    leave();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? 'Edit Activity' : 'New Activity' }} />
      {archived && (
        <Card tone="warningSoft">
          <ThemedText type="smallBold">This activity is archived</ThemedText>
          <ThemedText type="small">Parents can&apos;t see it. Restore it to make it visible again.</ThemedText>
        </Card>
      )}

      {progress && (
        <Card tone="primarySoft">
          <ThemedText type="smallBold">Class progress</ThemedText>
          <ThemedText type="small">
            {progress.completed} of {progress.students} completed • {progress.inProgress} in progress
          </ThemedText>
        </Card>
      )}

      <Card>
        <Select
          label="Class"
          placeholder="Choose a class"
          searchPlaceholder="Search subject, grade or section"
          options={classes.map((c) => ({
            value: `${c.sectionId}:${c.subject.id}`,
            label: `${c.subject.name} • Grade ${c.grade} ${c.section}`,
            description: `${c.studentCount} students`,
          }))}
          value={form.classKey}
          onChange={(v) => setForm((f) => ({ ...f, classKey: v, lessonId: 'none' }))}
        />
        <ThemedText type="smallBold">Type</ThemedText>
        <Chips options={TYPES} value={form.type} onChange={set('type')} />
        <TextField label="Title" value={form.title} onChangeText={set('title')} maxLength={160} />
        <TextField label="Short description" value={form.description} onChangeText={set('description')} maxLength={255} />
        <TextField label="Instructions (optional)" multiline value={form.instructions} onChangeText={set('instructions')} maxLength={2000} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Assigned" placeholder="YYYY-MM-DD" value={form.assignedOn} onChangeText={set('assignedOn')} maxLength={10} />
          </View>
          <View style={styles.flex}>
            <TextField label="Due / date" placeholder="YYYY-MM-DD" value={form.dueOn} onChangeText={set('dueOn')} maxLength={10} />
          </View>
        </View>
      </Card>

      <Card>
        <Select
          label="Related lesson"
          searchPlaceholder="Search lessons"
          options={[
            { value: 'none', label: 'None' },
            ...classLessons
              .filter((l) => !l.archived)
              .map((l) => ({ value: String(l.id), label: l.title, description: formatLongDate(l.startsAt) })),
          ]}
          value={form.lessonId}
          onChange={set('lessonId')}
        />
        <TextField label="Topics (comma-separated)" value={form.topics} onChangeText={set('topics')} />
        <ListRow
          title="Suggest review"
          subtitle="Shows a “Review Suggested” badge to parents"
          right={
            <Switch
              value={form.reviewSuggested}
              onValueChange={set('reviewSuggested')}
              trackColor={{ true: theme.primary }}
              accessibilityLabel="Suggest review"
            />
          }
        />
      </Card>

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button
        label={id ? 'Save changes' : 'Create & notify parents'}
        onPress={submit}
        loading={save.isPending}
        disabled={!form.title || !form.description || !form.classKey}
      />
      {id && (
        <Button
          variant={archived ? 'secondary' : 'danger'}
          label={archived ? 'Restore activity' : 'Archive activity'}
          onPress={toggleArchive}
          loading={archive.isPending}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
