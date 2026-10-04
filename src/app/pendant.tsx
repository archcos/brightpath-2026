import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { usePendant } from '@/hooks/queries';
import { formatTime } from '@/utils/format';

export default function PendantScreen() {
  const { data: p, isLoading, error, refetch, isRefetching } = usePendant();

  if (isLoading) return <Loading />;
  if (error || !p) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Card style={styles.center}>
        <ThemedText style={styles.icon}>🎙️</ThemedText>
        <Badge label={p.online ? 'Connected' : 'Offline'} tone={p.online ? 'success' : 'danger'} />
        <ThemedText type="heading">Teacher Pendant {p.code}</ThemedText>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <ThemedText type="label" themeColor="textSecondary">
              Battery
            </ThemedText>
            <ThemedText type="heading">{p.battery}%</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="label" themeColor="textSecondary">
              Last Sync
            </ThemedText>
            <ThemedText type="heading">{formatTime(p.lastSyncAt)}</ThemedText>
          </View>
        </View>
      </Card>

      {p.lastRecording && (
        <Card
          onPress={() => router.push({ pathname: '/lesson/[slug]', params: { slug: p.lastRecording!.slug } })}
          accessibilityLabel={`Last recording: ${p.lastRecording.title}`}>
          <ThemedText type="label" themeColor="textSecondary">
            Last Recording
          </ThemedText>
          <ThemedText type="caption" style={{ color: p.lastRecording.subject.color, fontWeight: 700 }}>
            {p.lastRecording.subject.name}
          </ThemedText>
          <ThemedText type="subtitle">{p.lastRecording.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTime(p.lastRecording.startsAt)} • {p.lastRecording.durationMin} min
          </ThemedText>
        </Card>
      )}

      <Card>
        <ThemedText type="subtitle">Device Details</ThemedText>
        <ListRow title="Firmware" right={<ThemedText type="small">{p.firmware}</ThemedText>} />
        <ListRow title="Connection" right={<ThemedText type="small">{p.connection}</ThemedText>} />
        <ListRow title="Status" right={<ThemedText type="small">{p.online ? 'Online' : 'Offline'}</ThemedText>} />
      </Card>

      <ThemedText type="caption" themeColor="textSecondary">
        The pendant is managed by the school. Bluetooth pairing and live recording happen on the teacher&apos;s device.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  icon: { fontSize: 44, lineHeight: 54 },
  stats: { flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.two },
  stat: { alignItems: 'center', gap: Spacing.half },
});
