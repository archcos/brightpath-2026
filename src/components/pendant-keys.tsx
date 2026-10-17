import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/query-state';
import { Spacing } from '@/constants/theme';
import { usePendantKeys, useRevokePendantKey } from '@/hooks/admin-queries';
import { errorMessage } from '@/services/api';
import type { PendantKey } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { formatMonthDay, formatTime } from '@/utils/format';

const STATE: Record<PendantKey['state'], { label: string; tone: BadgeTone }> = {
  waiting: { label: 'Not used yet', tone: 'info' },
  bound: { label: 'Locked to a device', tone: 'success' },
  revoked: { label: 'Revoked', tone: 'neutral' },
};

const when = (at: string) => `${formatMonthDay(at)}, ${formatTime(at)}`;

/**
 * A pendant's upload keys (school admins only). Each key locks to the first device that uploads with it;
 * revoke a key when its device is lost or replaced.
 */
export function PendantKeys({ pendantId, pendantCode, canManage }: { pendantId: number; pendantCode: string; canManage: boolean }) {
  const { data, isLoading, error } = usePendantKeys(pendantId);
  const revoke = useRevokePendantKey();

  const confirmRevoke = async (k: PendantKey) => {
    const ok = await confirmDestructive(
      'Revoke this key?',
      k.deviceId
        ? `Device ${k.deviceId} won't be able to upload ${pendantCode}'s lessons any more.`
        : 'It has not been used yet; nobody will be able to use it.',
      'Revoke key',
    );
    if (ok) revoke.mutate({ id: pendantId, keyId: k.id });
  };

  if (isLoading) return <Loading />;
  if (error) return <ThemedText type="caption" themeColor="danger">{errorMessage(error)}</ThemedText>;
  if (!data?.length) {
    return (
      <ThemedText type="caption" themeColor="textSecondary">
        No upload keys yet. Make one with “New key”.
      </ThemedText>
    );
  }

  return (
    <View style={styles.list}>
      {revoke.error && (
        <ThemedText type="caption" themeColor="danger">
          {errorMessage(revoke.error)}
        </ThemedText>
      )}
      {data.map((k) => (
        <View key={k.id} style={styles.key}>
          <View style={styles.row}>
            <Badge label={STATE[k.state].label} tone={STATE[k.state].tone} />
            {k.deviceId && (
              <ThemedText type="code" selectable style={styles.flex} numberOfLines={1}>
                {k.deviceId}
              </ThemedText>
            )}
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            Made {when(k.createdAt)}
            {k.createdBy ? ` by ${k.createdBy}` : ''}
            {k.lastUsedAt ? ` • last upload ${when(k.lastUsedAt)}` : ''}
            {k.revokedAt ? ` • revoked ${when(k.revokedAt)}` : ''}
          </ThemedText>
          {canManage && k.state !== 'revoked' && (
            <Button
              small
              variant="danger"
              label="Revoke key"
              onPress={() => confirmRevoke(k)}
              loading={revoke.isPending && revoke.variables?.keyId === k.id}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  key: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
