import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SubjectIcon, SubjectLabel } from '@/components/subject-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { Lesson } from '@/types/api';
import { formatTime } from '@/utils/format';

const openLesson = (slug: string) => router.push({ pathname: '/lesson/[slug]', params: { slug } });

/** Large card used on Home's "Today's Learning". */
export function LessonCard({ lesson }: { lesson: Lesson }) {
  const ready = lesson.summaryStatus === 'ready';
  return (
    <Card>
      <View style={styles.head}>
        <SubjectIcon subject={lesson.subject} />
        <View style={styles.flex}>
          <SubjectLabel subject={lesson.subject} />
          <ThemedText type="subtitle">{lesson.title}</ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {formatTime(lesson.startsAt)} • {lesson.durationMin}-minute lesson
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {lesson.teacher}
      </ThemedText>
      <Badge label={ready ? 'Summary Ready' : 'Preparing summary'} tone={ready ? 'info' : 'neutral'} />
      <Button label="View Summary" onPress={() => openLesson(lesson.slug)} disabled={!ready} />
    </Card>
  );
}

/** Compact row used in lists. */
export function LessonRow({ lesson }: { lesson: Lesson }) {
  const ready = lesson.summaryStatus === 'ready';
  return (
    <Card
      onPress={ready ? () => openLesson(lesson.slug) : undefined}
      accessibilityLabel={`${lesson.subject.name}: ${lesson.title}`}
      style={styles.row}>
      <SubjectIcon subject={lesson.subject} />
      <View style={styles.flex}>
        <SubjectLabel subject={lesson.subject} />
        <ThemedText type="smallBold">{lesson.title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatTime(lesson.startsAt)} • {lesson.durationMin} min • {lesson.teacher}
        </ThemedText>
      </View>
      <Badge label={ready ? 'Summary' : 'Preparing'} tone={ready ? 'primary' : 'neutral'} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
});
