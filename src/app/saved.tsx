import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useSaved, useToggleSaved } from '@/hooks/queries';
import type { SavedType } from '@/services/brightpath';
import { ACTIVITY_TYPE_LABEL, formatMonthDay } from '@/utils/format';

type Tab = 'lessons' | 'words' | 'activities';
const TYPE: Record<Tab, SavedType> = { lessons: 'lesson', words: 'word', activities: 'activity' };

export default function SavedScreen() {
  const { child } = useChild();
  const [tab, setTab] = useState<Tab>('lessons');
  const { data, isLoading, error, refetch } = useSaved();
  const toggle = useToggleSaved();

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const items =
    tab === 'lessons'
      ? data.lessons.map((l) => ({
          id: l.id,
          color: l.subject.color,
          kicker: l.subject.name,
          title: l.title,
          meta: formatMonthDay(l.startsAt),
          open: () => router.push({ pathname: '/lesson/[slug]', params: { slug: l.slug } }),
        }))
      : tab === 'words'
        ? data.words.map((w) => ({
            id: w.id,
            color: w.subject.color,
            kicker: w.subject.name,
            title: w.word,
            meta: `From “${w.lesson.title}”`,
            open: () => router.push({ pathname: '/lesson/[slug]', params: { slug: w.lesson.slug } }),
          }))
        : data.activities.map((a) => ({
            id: a.id,
            color: a.subject.color,
            kicker: `${ACTIVITY_TYPE_LABEL[a.type]} • ${a.subject.name}`,
            title: a.title,
            meta: `Due ${formatMonthDay(a.dueOn)}`,
            open: () => router.push({ pathname: '/activity/[slug]', params: { slug: a.slug } }),
          }));

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">{child?.firstName}&apos;s bookmarked items</ThemedText>
      <Chips
        options={[
          { value: 'lessons', label: `Lessons ${data.lessons.length}` },
          { value: 'words', label: `Words ${data.words.length}` },
          { value: 'activities', label: `Activities ${data.activities.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          message={`Saved ${tab} will appear here. Use the bookmark on a lesson or tap an important word.`}
        />
      ) : (
        items.map((item) => (
          <Card key={item.id} onPress={item.open} style={styles.row} accessibilityLabel={item.title}>
            <View style={styles.flex}>
              <ThemedText type="caption" style={{ color: item.color, fontWeight: 700 }}>
                {item.kicker}
              </ThemedText>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {item.meta}
              </ThemedText>
            </View>
            <Button
              small
              variant="ghost"
              label="Remove"
              onPress={() => toggle.mutate({ type: TYPE[tab], itemId: item.id, saved: true })}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
});
