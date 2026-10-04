import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { LessonRow } from '@/components/lesson-card';
import { SubjectIcon } from '@/components/subject-icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useChildProfile, useOverview } from '@/hooks/queries';

/** A simplified, child-friendly view. Parent-only screens are reached only via "Back to Parent Mode". */
export default function StudentModeScreen() {
  const { child } = useChild();
  const overview = useOverview();
  const profile = useChildProfile();
  const data = overview.data;

  return (
    <Screen tab>
      <Button variant="ghost" small label="← Back to Parent Mode" onPress={() => router.back()} />
      <Card tone="primarySoft" style={styles.hero}>
        <ThemedText style={styles.avatar}>{child?.avatar}</ThemedText>
        <ThemedText type="label" themeColor="primary">
          Student Mode
        </ThemedText>
        <ThemedText type="title">
          Hi, {child?.firstName}! 👋
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Grade {child?.grade} • {child?.section}
        </ThemedText>
      </Card>

      {overview.isLoading ? (
        <Loading />
      ) : overview.error || !data ? (
        <ErrorState error={overview.error} onRetry={overview.refetch} />
      ) : (
        <>
          <Section title="Today's Lessons">
            {data.todayLessons.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </Section>

          {profile.data && (
            <Section title="My Subjects">
              <View style={styles.subjects}>
                {profile.data.subjects.map((s) => (
                  <Card key={s.code} style={styles.subject}>
                    <SubjectIcon subject={s} />
                    <ThemedText type="caption" style={styles.center}>
                      {s.name}
                    </ThemedText>
                  </Card>
                ))}
              </View>
            </Section>
          )}

          <Section title="What I Need To Do">
            {data.needsAttention.length === 0 ? (
              <ThemedText themeColor="textSecondary">All done for now. Great job! 🎉</ThemedText>
            ) : (
              data.needsAttention.map((a) => <ActivityCard key={a.id} activity={a} />)
            )}
          </Section>

          <Card onPress={() => router.push('/saved')}>
            <ThemedText type="subtitle">🔖 Saved lessons & words</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data.week.lessonsReviewed} lessons reviewed this week. Reading a summary again helps it stick.
            </ThemedText>
          </Card>
        </>
      )}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
        Ask a parent to switch back to Parent Mode anytime.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  avatar: { fontSize: 48, lineHeight: 60 },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  subject: { width: 100, alignItems: 'center' },
  center: { textAlign: 'center' },
});
