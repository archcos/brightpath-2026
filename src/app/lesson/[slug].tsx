import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SubjectIcon, SubjectLabel } from '@/components/subject-icon';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useLesson, useMarkLessonViewed, useSetActivityStatus, useToggleSaved } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { activityBadge, formatLongDate, formatMonthDay, formatTime } from '@/utils/format';

export default function LessonScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: lesson, isLoading, error, refetch } = useLesson(slug);
  const markViewed = useMarkLessonViewed();
  const toggleSaved = useToggleSaved();
  const setStatus = useSetActivityStatus();

  useEffect(() => {
    if (lesson?.summaryStatus === 'ready') markViewed.mutate(lesson.slug);
    // Record a view once per lesson load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.slug, lesson?.summaryStatus]);

  if (isLoading) return <Loading />;
  if (error || !lesson) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={lesson.saved ? 'Remove from saved' : 'Save lesson'}
              onPress={() => toggleSaved.mutate({ type: 'lesson', itemId: lesson.id, saved: lesson.saved })}>
              <ThemedText style={styles.headerIcon}>{lesson.saved ? '🔖' : '📑'}</ThemedText>
            </Pressable>
          ),
        }}
      />

      <View style={styles.hero}>
        <View style={styles.row}>
          <SubjectIcon subject={lesson.subject} size={32} />
          <SubjectLabel subject={lesson.subject} />
        </View>
        <ThemedText type="title">{lesson.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          👤 {lesson.teacher}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          📅 {formatLongDate(lesson.startsAt)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          🕘 {formatTime(lesson.startsAt)} • {lesson.durationMin}-minute class
        </ThemedText>
        <Badge label={lesson.summaryStatus === 'ready' ? '✨ AI Lesson Summary' : 'Preparing summary'} tone="info" />
      </View>

      {lesson.summaryStatus !== 'ready' ? (
        <Card>
          <ThemedText type="subtitle">The summary is being prepared</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Check back soon — we&apos;ll notify you when it&apos;s ready.
          </ThemedText>
        </Card>
      ) : (
        <>
          <Card>
            <ThemedText type="subtitle">What They Learned</ThemedText>
            <ThemedText>{lesson.summary}</ThemedText>
          </Card>

          <Card>
            <ThemedText type="subtitle">Key Learning Points</ThemedText>
            {lesson.keyPoints.map((p, i) => (
              <ThemedText key={i}>
                {p.emoji} {p.text}
              </ThemedText>
            ))}
          </Card>

          <Card>
            <ThemedText type="subtitle">Important Words</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Tap a word to save it for review.
            </ThemedText>
            <View style={styles.wrap}>
              {lesson.words.map((w) => (
                <Pressable
                  key={w.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: w.saved }}
                  accessibilityLabel={`${w.word}${w.saved ? ', saved' : ''}`}
                  onPress={() => toggleSaved.mutate({ type: 'word', itemId: w.id, saved: w.saved })}
                  style={[
                    styles.word,
                    { backgroundColor: w.saved ? theme.primary : theme.primarySoft },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: w.saved ? theme.onPrimary : theme.primary }}>
                    {w.saved ? '★ ' : ''}
                    {w.word}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Card>

          {lesson.rememberThis && (
            <Card tone="warningSoft">
              <ThemedText type="subtitle">💡 Remember This</ThemedText>
              <ThemedText>{lesson.rememberThis}</ThemedText>
            </Card>
          )}

          <Card tone="primarySoft">
            <ThemedText type="subtitle">Help Your Child Review</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Simple ways to support this lesson at home.
            </ThemedText>
            {lesson.askChild && <Tip label="Ask your child" text={`“${lesson.askChild}”`} />}
            {lesson.tryTogether && <Tip label="Try together" text={lesson.tryTogether} />}
            {lesson.words.length > 0 && <Tip label="Review" text={lesson.words.map((w) => w.word).join(' • ')} />}
          </Card>
        </>
      )}

      <Card>
        <ThemedText type="subtitle">Assignments & Activities</ThemedText>
        {lesson.activities.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No assignment was given for this lesson.
          </ThemedText>
        ) : (
          lesson.activities.map((a) => {
            const badge = activityBadge(a.state, a.status);
            return (
              <View key={a.id} style={[styles.activity, { borderColor: theme.border }]}>
                <ThemedText type="label">{a.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {a.description}
                </ThemedText>
                <View style={styles.row}>
                  <Badge label={badge.label} tone={badge.tone} />
                  <ThemedText type="caption" themeColor="textSecondary">
                    Due {formatMonthDay(a.dueOn)}
                  </ThemedText>
                </View>
                <View style={styles.row}>
                  <Button
                    small
                    variant="secondary"
                    label="View"
                    onPress={() => router.push({ pathname: '/activity/[slug]', params: { slug: a.slug } })}
                  />
                  {!a.isEvent && a.status !== 'completed' && (
                    <Button
                      small
                      variant="ghost"
                      label="Mark done"
                      loading={setStatus.isPending && setStatus.variables?.slug === a.slug}
                      onPress={() => setStatus.mutate({ slug: a.slug, status: 'completed' })}
                    />
                  )}
                </View>
              </View>
            );
          })
        )}
      </Card>

      <ThemedText type="caption" themeColor="textSecondary">
        This summary was created with AI from the classroom lesson. Teachers can review and correct summaries, so check
        with your child&apos;s teacher for anything important.
      </ThemedText>
    </Screen>
  );
}

function Tip({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.tip}>
      <ThemedText type="label" themeColor="primary">
        {label}
      </ThemedText>
      <ThemedText>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  word: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  tip: { gap: Spacing.one, marginTop: Spacing.two },
  activity: { gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  headerIcon: { fontSize: 22, lineHeight: 28 },
});
