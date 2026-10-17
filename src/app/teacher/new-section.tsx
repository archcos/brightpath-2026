import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAddSection, useSectionOptions } from '@/hooks/teacher-queries';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/services/api';
import { confirmAction } from '@/utils/confirm';
import { sectionName } from '@/utils/format';

const GRADES = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Grade ${i + 1}` }));

/**
 * A teacher adds their own section (e.g. "Grade 4 - Faith") and the subjects they teach in it, when their
 * school admin allows it. They become its adviser and can then add students and post lessons.
 */
export default function NewSectionScreen() {
  const theme = useTheme();
  const options = useSectionOptions();
  const add = useAddSection();
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [error, setError] = useState<string>();

  if (options.isLoading) return <Loading />;
  if (options.error || !options.data) return <ErrorState error={options.error} onRetry={options.refetch} />;
  const { allowed, schoolYears, subjects } = options.data;
  if (!allowed) {
    return (
      <Screen>
        <Card tone="infoSoft">
          <ThemedText type="smallBold">Adding sections is turned off</ThemedText>
          <ThemedText type="small">Your school admin adds sections and assigns your classes. Ask them to add you, or to let teachers add their own sections.</ThemedText>
        </Card>
      </Screen>
    );
  }

  const schoolYear = year || schoolYears[0];
  const title = grade && name.trim() ? sectionName(Number(grade), name.trim()) : '';
  const toggle = (id: number) => setSubjectIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async () => {
    setError(undefined);
    const picked = subjects.filter((s) => subjectIds.includes(s.id)).map((s) => s.name).join(', ');
    const ok = await confirmAction(
      `Add ${title}?`,
      `For ${schoolYear}. You'll be its adviser and teach ${picked} there.`,
      'Add section',
    );
    if (!ok) return;
    try {
      await add.mutateAsync({ grade: Number(grade), name: name.trim(), schoolYear, subjectIds });
      if (router.canGoBack()) router.back();
      else router.replace('/teacher');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary">
        Name the section the way your school does, e.g. Grade 4 - Faith.
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.grade}>
          <Select label="Grade" placeholder="Choose" options={GRADES} value={grade} onChange={setGrade} searchable={false} />
        </View>
        <View style={styles.flex}>
          <TextField label="Section name" placeholder="e.g. Faith" value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" />
        </View>
      </View>
      <Select
        label="School year"
        options={schoolYears.map((y, i) => ({ value: y, label: y, description: i === 0 ? 'This school year' : 'Next school year' }))}
        value={schoolYear}
        onChange={setYear}
        searchable={false}
      />
      <ThemedText type="smallBold">Subjects you teach in this section</ThemedText>
      <View style={styles.chips}>
        {subjects.map((s) => {
          const on = subjectIds.includes(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => toggle(s.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={s.name}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: on ? s.color : theme.border, backgroundColor: on ? theme.primarySoft : theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={on ? { color: theme.primary } : undefined}>
                {on ? '✓ ' : ''}
                {s.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button
        label={title ? `Add ${title}` : 'Add section'}
        onPress={submit}
        loading={add.isPending}
        disabled={!title || subjectIds.length === 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  grade: { flex: 1, minWidth: 0 },
  flex: { flex: 2, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 44, paddingHorizontal: Spacing.three, justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1 },
  pressed: { opacity: 0.7 },
});
