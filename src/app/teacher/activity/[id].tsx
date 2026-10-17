import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
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
  useTeacherPastClasses,
  useTeacherLessons,
} from '@/hooks/teacher-queries';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, errorMessage } from '@/services/api';
import type { ActivityInput, ActivityType, ClassAssignment, TeacherActivityDetail } from '@/types/api';
import { classKey, classOptions } from '@/utils/classes';
import { confirmAction, confirmDestructive } from '@/utils/confirm';
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

// Return to the dashboard even when the editor was opened directly (e.g. by URL on web).
const leave = () => (router.canGoBack() ? router.back() : router.replace('/teacher' as Href));

// A function so "today" is computed when the form opens, not when the module first loaded.
const empty = (): Form => {
  const today = toISODate(new Date());
  return {
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
};

const FIELD_LABEL: Record<string, string> = {
  sectionId: 'Class',
  subjectId: 'Class',
  lessonId: 'Related lesson',
  title: 'Title',
  description: 'Short description',
  instructions: 'Instructions',
  assignedOn: 'Assigned',
  dueOn: 'Due date',
  topics: 'Topics',
};

/** Validation errors with readable field names ("Due date: Due date must be on or after…"). */
function fieldErrors(e: unknown) {
  if (!(e instanceof ApiError && e.details)) return errorMessage(e);
  return e.details
    .map((d) => {
      const field = FIELD_LABEL[d.field.split('.')[0]] ?? d.field;
      return field ? `${field}: ${d.message}` : d.message;
    })
    .join('\n');
}

const TYPES = Object.entries(ACTIVITY_TYPE_LABEL).map(([value, label]) => ({ value: value as ActivityType, label }));

/** Loads the activity (when editing), then mounts the form with its initial values. */
export default function ActivityEditor() {
  // `classKey`: the class the dashboard was showing, used as the default for a new item.
  const { id: idParam, classKey: presetClass } = useLocalSearchParams<{ id: string; classKey?: string }>();
  const id = idParam === 'new' ? null : Number(idParam);
  const invalidId = id !== null && !(Number.isInteger(id) && id > 0);
  const classes = useTeacherClasses();
  const pastClasses = useTeacherPastClasses();
  const existing = useTeacherActivity(invalidId ? null : id);

  if (invalidId) return <ErrorState error={new Error('This activity link is not valid.')} />;
  if (classes.isLoading || (id && existing.isLoading)) return <Loading />;
  if (classes.error) return <ErrorState error={classes.error} onRetry={classes.refetch} />;
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
    : {
        ...empty(),
        classKey: classes.data?.some((c) => classKey(c) === presetClass) ? presetClass! : first ? classKey(first) : '',
      };

  return (
    <ActivityForm
      key={id ?? 'new'}
      id={id}
      initial={initial}
      classes={classes.data ?? []}
      pastClasses={pastClasses.data ?? []}
      progress={a?.progress}
      archived={a?.archived ?? false}
    />
  );
}

type ActivityFormProps = {
  id: number | null;
  initial: Form;
  classes: ClassAssignment[];
  /** Classes the teacher no longer teaches: their items open read-only. */
  pastClasses: ClassAssignment[];
  progress?: TeacherActivityDetail['progress'];
  archived: boolean;
};

function ActivityForm({ id, initial, classes, pastClasses, progress, archived }: ActivityFormProps) {
  const theme = useTheme();
  const lessons = useTeacherLessons();
  const save = useSaveActivity();
  const archive = useArchiveActivity();
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState<string>();
  // Existing items open read-only so they can be read first; new ones start in edit mode.
  const [editing, setEditing] = useState(id === null);
  // An item from a past class (e.g. last school year) can be read but not changed; the server refuses edits too.
  const readOnly = id !== null && !classes.some((c) => classKey(c) === initial.classKey);
  const ownPastClass = readOnly ? pastClasses.filter((c) => classKey(c) === initial.classKey) : [];

  const cancel = () => {
    setForm(initial);
    setError(undefined);
    setEditing(false);
  };

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [sectionId, subjectId] = form.classKey.split(':').map(Number);
  // Only lessons from the same class can be linked (the server enforces the same rule).
  const classLessons = (lessons.data ?? []).filter((l) => l.sectionId === sectionId && l.subject.id === subjectId);

  const submit = async () => {
    setError(undefined);
    const ok = await confirmAction(
      id ? 'Save changes?' : 'Create activity?',
      id
        ? 'Parents of every student in this class will see the updated details.'
        : 'Parents of every student in this class will be notified.',
      id ? 'Save' : 'Create & notify',
    );
    if (!ok) return;
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
      setError(fieldErrors(e));
    }
  };

  // Activities are never deleted: archiving hides them from parents and can be undone.
  const toggleArchive = async () => {
    if (!id) return;
    if (!archived && !(await confirmDestructive('Archive activity?', 'Parents will no longer see it. You can restore it later.', 'Archive'))) {
      return;
    }
    setError(undefined);
    try {
      await archive.mutateAsync({ id, archived: !archived });
      leave();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: !id ? 'New Activity' : editing ? 'Edit Activity' : 'Activity' }} />
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
          options={classOptions(classes, ownPastClass)}
          value={form.classKey}
          onChange={(v) => setForm((f) => ({ ...f, classKey: v, lessonId: 'none' }))}
          disabled={!editing}
        />
        <Select<ActivityType> label="Type" options={TYPES} value={form.type} onChange={set('type')} disabled={!editing} />
        <TextField label="Title" wrap maxLines={3} editable={editing} value={form.title} onChangeText={set('title')} maxLength={160} />
        <TextField label="Short description" wrap editable={editing} value={form.description} onChangeText={set('description')} maxLength={255} />
        <TextField label="Instructions (optional)" multiline editable={editing} value={form.instructions} onChangeText={set('instructions')} maxLength={2000} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <DateField
              label="Assigned"
              mode="date"
              value={form.assignedOn}
              // The due date can't come before the assigned date, so move it along.
              onChange={(v) => setForm((f) => ({ ...f, assignedOn: v, dueOn: f.dueOn && f.dueOn < v ? v : f.dueOn }))}
              disabled={!editing}
            />
          </View>
          <View style={styles.flex}>
            <DateField label="Due / date" mode="date" value={form.dueOn} onChange={set('dueOn')} min={form.assignedOn} disabled={!editing} />
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
          disabled={!editing}
        />
        <TextField label="Topics (comma-separated)" wrap maxLines={3} editable={editing} value={form.topics} onChangeText={set('topics')} maxLength={900} />
        <ListRow
          title="Suggest review"
          subtitle="Shows a “Review Suggested” badge to parents"
          right={
            <Switch
              value={form.reviewSuggested}
              onValueChange={set('reviewSuggested')}
              disabled={!editing}
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
      {editing ? (
        <>
          <Button
            label={id ? 'Save changes' : 'Create & notify parents'}
            onPress={submit}
            loading={save.isPending}
            disabled={!form.title || !form.description || !form.classKey}
          />
          {id && <Button variant="ghost" label="Cancel" onPress={cancel} />}
        </>
      ) : readOnly ? (
        <Card tone="infoSoft">
          <ThemedText type="smallBold">Past class — read-only</ThemedText>
          <ThemedText type="small">
            You no longer teach this class, so this activity can&apos;t be changed. Ask your school admin if that&apos;s a mistake.
          </ThemedText>
        </Card>
      ) : (
        <Button label="Edit activity" onPress={() => setEditing(true)} />
      )}
      {id && !editing && !readOnly && (
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
