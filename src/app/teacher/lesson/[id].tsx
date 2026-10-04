import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useArchiveLesson, useSaveLesson, useTeacherClasses, useTeacherLesson } from '@/hooks/teacher-queries';
import { ApiError } from '@/services/api';
import type { ClassAssignment, LessonInput } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { toISODate } from '@/utils/format';

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

const EMPTY: Form = {
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
};

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
  const classes = useTeacherClasses();
  const existing = useTeacherLesson(id);

  if (classes.isLoading || (id && existing.isLoading)) return <Loading />;
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
    : { ...EMPTY, classKey: first ? `${first.sectionId}:${first.subject.id}` : '' };

  return (
    <LessonForm key={id ?? 'new'} id={id} initial={initial} classes={classes.data ?? []} archived={l?.archived ?? false} />
  );
}

type LessonFormProps = { id: number | null; initial: Form; classes: ClassAssignment[]; archived: boolean };

function LessonForm({ id, initial, classes, archived }: LessonFormProps) {
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
      setError(e instanceof ApiError && e.details ? e.details.map((d) => `${d.field}: ${d.message}`).join('\n') : (e as Error).message);
    }
  };

  // Lessons are never deleted: archiving hides them from parents and can be undone.
  const toggleArchive = async () => {
    if (!id) return;
    if (!archived && !(await confirmDestructive('Archive lesson?', 'Parents will no longer see it. You can restore it later.', 'Archive'))) {
      return;
    }
    await archive.mutateAsync({ id, archived: !archived });
    leave();
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
          onChange={set('classKey')}
        />
        <TextField label="Lesson title" value={form.title} onChangeText={set('title')} maxLength={160} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Date" placeholder="YYYY-MM-DD" value={form.date} onChangeText={set('date')} maxLength={10} />
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
        <ThemedText type="smallBold">Summary status</ThemedText>
        <Chips<Form['summaryStatus']>
          options={[
            { value: 'preparing', label: 'Draft (hidden summary)' },
            { value: 'ready', label: 'Published to parents' },
          ]}
          value={form.summaryStatus}
          onChange={set('summaryStatus')}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          Publishing notifies the parents of every student in this section.
        </ThemedText>
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
