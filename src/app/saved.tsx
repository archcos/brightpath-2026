import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pager } from '@/components/ui/pager';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useChild } from '@/context/child-context';
import { useSaved, useToggleSaved } from '@/hooks/queries';
import type { SavedType } from '@/services/brightpath';
import type { SavedActivity, SavedLesson, SavedWord } from '@/types/api';
import { ACTIVITY_TYPE_LABEL, formatMonthDay } from '@/utils/format';

type Tab = 'lessons' | 'words' | 'activities';
const TYPE: Record<Tab, SavedType> = { lessons: 'lesson', words: 'word', activities: 'activity' };

export default function SavedScreen() {
  const { child } = useChild();
  const [tab, setTab] = useState<Tab>('lessons');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useSaved(TYPE[tab], page);
  const toggle = useToggleSaved();

  // Each tab loads on its own, so the tabs stay put while the list below loads.
  const items = !data
    ? []
    : tab === 'lessons'
      ? (data.items as SavedLesson[]).map((l) => ({
          id: l.id,
          color: l.subject.color,
          kicker: l.subject.name,
          title: l.title,
          meta: formatMonthDay(l.startsAt),
          open: () => router.push({ pathname: '/lesson/[slug]', params: { slug: l.slug } }),
        }))
      : tab === 'words'
        ? (data.items as SavedWord[]).map((w) => ({
            id: w.id,
            color: w.subject.color,
            kicker: w.subject.name,
            title: w.word,
            meta: `From “${w.lesson.title}”`,
            open: () => router.push({ pathname: '/lesson/[slug]', params: { slug: w.lesson.slug } }),
          }))
        : (data.items as SavedActivity[]).map((a) => ({
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
      <Segmented
        options={[
          { value: 'lessons', label: `Lessons ${data?.counts.lesson ?? ''}` },
          { value: 'words', label: `Words ${data?.counts.word ?? ''}` },
          { value: 'activities', label: `Activities ${data?.counts.activity ?? ''}` },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
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
      <Pager data={data} onChange={setPage} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
});
