import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useArchiveLesson, useSaveLesson, useTeacherClasses, useTeacherLesson } from '@/hooks/teacher-queries';
import { ApiError, errorMessage } from '@/services/api';
import type { ClassAssignment, LessonInput } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { formatRelativeDay, formatTime, maskDate, plural, toISODate } from '@/utils/format';

type Form = {
  classKey: string;
  title: string;
  date: string;
  time: string;
  durationMin: string;
  summaryStatus: 'preparing' | 'ready';
  summary: string;
  keyPoints: string;
  words: string;
  rememberThis: string;
  askChild: string;
  tryTogether: string;
};

// Return to the dashboard even when the editor was opened directly (e.g. by URL on web).
const leave = () => (router.canGoBack() ? router.back() : router.replace('/teacher' as Href));

const FIELD_LABEL: Record<string, string> = {
  sectionId: 'Class',
  subjectId: 'Class',
  title: 'Lesson title',
  startsAt: 'Date & time',
  durationMin: 'Minutes',
  summary: 'What they learned',
  rememberThis: 'Remember this',
  askChild: 'Ask your child',
  tryTogether: 'Try together',
  keyPoints: 'Key learning points',
  words: 'Important words',
};

/** Validation errors with readable field names ("Date & time: Use YYYY-MM-DD HH:MM"). */
function fieldErrors(e: unknown) {
  if (!(e instanceof ApiError && e.details)) return errorMessage(e);
  return e.details
    .map((d) => {
      const field = FIELD_LABEL[d.field.split('.')[0]] ?? d.field;
      return field ? `${field}: ${d.message}` : d.message;
    })
    .join('\n');
}

// A function so "today" is computed when the form opens, not when the module first loaded.
const empty = (): Form => ({
  classKey: '',
  title: '',
  date: toISODate(new Date()),
  time: '09:00',
  durationMin: '40',
  summaryStatus: 'preparing',
  summary: '',
  keyPoints: '',
  words: '',
  rememberThis: '',
  askChild: '',
  tryTogether: '',
});

/** "🌱 Roots absorb water" → { emoji: '🌱', text: 'Roots absorb water' }. Lines without a leading emoji get ✅. */
function parsePoints(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, ...rest] = line.split(/\s+/);
      const isEmoji = first.length <= 8 && !/[A-Za-z0-9À-ɏ]/.test(first) && rest.length > 0;
      return isEmoji ? { emoji: first, text: rest.join(' ') } : { emoji: '✅', text: line };
    });
}

/** Loads the lesson (when editing), then mounts the form with its initial values. */
export default function LessonEditor() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = idParam === 'new' ? null : Number(idParam);
  const invalidId = id !== null && !(Number.isInteger(id) && id > 0);
  const classes = useTeacherClasses();
  const existing = useTeacherLesson(invalidId ? null : id);

  if (invalidId) return <ErrorState error={new Error('This lesson link is not valid.')} />;
  if (classes.isLoading || (id && existing.isLoading)) return <Loading />;
  if (classes.error) return <ErrorState error={classes.error} onRetry={classes.refetch} />;
  if (existing.error) return <ErrorState error={existing.error} onRetry={existing.refetch} />;

  const l = existing.data;
  const first = classes.data?.[0];
  const initial: Form = l
    ? {
        classKey: `${l.sectionId}:${l.subject.id}`,
        title: l.title,
        date: l.startsAt.slice(0, 10),
        time: l.startsAt.slice(11, 16),
        durationMin: String(l.durationMin),
        summaryStatus: l.summaryStatus,
        summary: l.summary ?? '',
        keyPoints: l.keyPoints.map((p) => `${p.emoji} ${p.text}`).join('\n'),
        words: l.words.join(', '),
        rememberThis: l.rememberThis ?? '',
        askChild: l.askChild ?? '',
        tryTogether: l.tryTogether ?? '',
      }
    : { ...empty(), classKey: first ? `${first.sectionId}:${first.subject.id}` : '' };

  return (
    <LessonForm
      key={id ?? 'new'}
      id={id}
      initial={initial}
      classes={classes.data ?? []}
      archived={l?.archived ?? false}
      aiAutoPublishAt={l?.aiDraftAt ? l.autoPublishAt : null}
    />
  );
}

type LessonFormProps = {
  id: number | null;
  initial: Form;
  classes: ClassAssignment[];
  archived: boolean;
  /** Set for an unreviewed AI draft: when it will be published automatically. */
  aiAutoPublishAt: string | null;
};

function LessonForm({ id, initial, classes, archived, aiAutoPublishAt }: LessonFormProps) {
  const save = useSaveLesson();
  const archive = useArchiveLesson();
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState<string>();

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setError(undefined);
    const [sectionId, subjectId] = form.classKey.split(':').map(Number);
    const input: LessonInput = {
      sectionId,
      subjectId,
      title: form.title,
      startsAt: `${form.date.trim()} ${form.time.trim()}`,
      durationMin: Number(form.durationMin),
      summaryStatus: form.summaryStatus,
      summary: form.summary,
      rememberThis: form.rememberThis,
      askChild: form.askChild,
      tryTogether: form.tryTogether,
      keyPoints: parsePoints(form.keyPoints),
      words: form.words.split(',').map((w) => w.trim()).filter(Boolean),
    };
    try {
      await save.mutateAsync({ id, input });
      leave();
    } catch (e) {
      setError(fieldErrors(e));
    }
  };

  // Lessons are never deleted: archiving hides them from parents and can be undone.
  const toggleArchive = async () => {
    if (!id) return;
    if (!archived && !(await confirmDestructive('Archive lesson?', 'Parents will no longer see it. You can restore it later.', 'Archive'))) {
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
      <Stack.Screen options={{ title: id ? 'Edit Lesson' : 'New Lesson' }} />
      {archived && (
        <Card tone="warningSoft">
          <ThemedText type="smallBold">This lesson is archived</ThemedText>
          <ThemedText type="small">Parents can&apos;t see it. Restore it to make it visible again.</ThemedText>
        </Card>
      )}
      {aiAutoPublishAt && !archived && (
        <Card tone="infoSoft">
          <ThemedText type="smallBold">🤖 AI draft from your recording</ThemedText>
          <ThemedText type="small">
            Check the summary below, then publish it. If you don&apos;t, it&apos;s shared with parents automatically at{' '}
            {formatTime(aiAutoPublishAt)} ({formatRelativeDay(aiAutoPublishAt)}).
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
            description: plural(c.studentCount, 'student'),
          }))}
          value={form.classKey}
          onChange={set('classKey')}
        />
        <TextField label="Lesson title" value={form.title} onChangeText={set('title')} maxLength={160} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Date" placeholder="YYYY-MM-DD" value={form.date} onChangeText={(t) => set('date')(maskDate(t))} keyboardType="number-pad" maxLength={10} />
          </View>
          <View style={styles.flex}>
            <TextField label="Start time" placeholder="HH:MM" value={form.time} onChangeText={set('time')} maxLength={5} />
          </View>
          <View style={styles.flex}>
            <TextField label="Minutes" keyboardType="number-pad" value={form.durationMin} onChangeText={set('durationMin')} maxLength={3} />
          </View>
        </View>
      </Card>

      <Card>
        <Select<Form['summaryStatus']>
          label="Summary status"
          options={[
            { value: 'preparing', label: 'Draft', description: "Parents see the lesson but not the summary yet" },
            {
              value: 'ready',
              label: 'Published to parents',
              description: 'Parents of every student in this section are notified',
            },
          ]}
          value={form.summaryStatus}
          onChange={set('summaryStatus')}
        />
        <TextField label="What they learned" multiline value={form.summary} onChangeText={set('summary')} maxLength={5000} />
        <TextField
          label="Key learning points (one per line, optional emoji first)"
          multiline
          placeholder={'🌱 Roots absorb water\n🍃 Leaves make food'}
          value={form.keyPoints}
          onChangeText={set('keyPoints')}
        />
        <TextField label="Important words (comma-separated)" value={form.words} onChangeText={set('words')} />
        <TextField label="Remember this" multiline value={form.rememberThis} onChangeText={set('rememberThis')} maxLength={1000} />
        <TextField label="Ask your child" value={form.askChild} onChangeText={set('askChild')} maxLength={255} />
        <TextField label="Try together" value={form.tryTogether} onChangeText={set('tryTogether')} maxLength={255} />
      </Card>

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button label={id ? 'Save changes' : 'Create lesson'} onPress={submit} loading={save.isPending} disabled={!form.title || !form.classKey} />
      {id && (
        <Button
          variant={archived ? 'secondary' : 'danger'}
          label={archived ? 'Restore lesson' : 'Archive lesson'}
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
