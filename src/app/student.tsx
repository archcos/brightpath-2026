import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { ActivityCard } from '@/components/activity-card';
import { LessonRow } from '@/components/lesson-card';
import { SubjectIcon } from '@/components/subject-icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Radius, Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useChildProfile, useOverview } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { sectionName } from '@/utils/format';

const exitStudentMode = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/**
 * A simplified, child-friendly view. Leaving needs a press-and-hold (and the Android back button is ignored)
 * so a child doesn't drop into Parent Mode by accident. This is a convenience, not a security boundary.
 */
export default function StudentModeScreen() {
  const theme = useTheme();
  const { child } = useChild();
  const overview = useOverview();
  const profile = useChildProfile();
  const data = overview.data;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  return (
    <Screen tab>
      <Pressable
        onLongPress={exitStudentMode}
        delayLongPress={800}
        accessibilityRole="button"
        accessibilityLabel="Return to Parent Mode"
        accessibilityHint="Press and hold to return to Parent Mode"
        style={({ pressed }) => [
          styles.exit,
          { borderColor: theme.border, backgroundColor: pressed ? theme.primarySoft : theme.backgroundElement },
        ]}>
        <ThemedText type="caption" themeColor="textSecondary">
          🔒 Press and hold to return to Parent Mode
        </ThemedText>
      </Pressable>
      <Card tone="primarySoft" style={styles.hero}>
        <ThemedText style={styles.avatar}>{child?.avatar}</ThemedText>
        <ThemedText type="label" themeColor="primary">
          Student Mode
        </ThemedText>
        <ThemedText type="title">
          Hi, {child?.firstName}! 👋
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {child ? sectionName(child.grade, child.section) : null}
        </ThemedText>
      </Card>

      {overview.isLoading ? (
        <Loading />
      ) : overview.error || !data ? (
        <ErrorState error={overview.error} onRetry={overview.refetch} />
      ) : (
        <>
          <Section title="Today's Lessons">
            {data.todayLessons.length === 0 ? (
              <ThemedText themeColor="textSecondary">No lessons recorded today yet. 📚</ThemedText>
            ) : (
              data.todayLessons.map((l) => <LessonRow key={l.id} lesson={l} />)
            )}
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
  exit: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  hero: { alignItems: 'center' },
  avatar: { fontSize: 48, lineHeight: 60 },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  subject: { width: 100, alignItems: 'center' },
  center: { textAlign: 'center' },
});
