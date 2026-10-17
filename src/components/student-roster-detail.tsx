import { Stack } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { SEX_LABEL } from '@/components/sex-field';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import {
  useIssueCode,
  useRemoveParent,
  useRevokeCode,
  useRosterStudent,
  type RosterKind,
} from '@/hooks/roster-queries';
import { errorMessage } from '@/services/api';
import type { StudentCode } from '@/types/api';
import { confirmAction, confirmDestructive } from '@/utils/confirm';
import { formatLongDate, formatMonthDay, formatTime, sectionName } from '@/utils/format';

const CODE_STATE: Record<StudentCode['state'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Not used yet', tone: 'success' },
  used: { label: 'Used', tone: 'neutral' },
  revoked: { label: 'Revoked', tone: 'warning' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const when = (at: string) => `${formatMonthDay(at)}, ${formatTime(at)}`;

/**
 * A student as their teacher or school admin sees them: which parents are connected (and with which code),
 * one-time codes to hand out, and controls to revoke a code or remove a parent.
 */
export function StudentRosterDetail({ kind, id }: { kind: RosterKind; id: number }) {
  const detail = useRosterStudent(kind, id);
  const issue = useIssueCode(kind);
  const revoke = useRevokeCode(kind);
  const remove = useRemoveParent(kind);
  const [error, setError] = useState<string>();

  if (detail.isLoading) return <Loading />;
  if (detail.error || !detail.data) return <ErrorState error={detail.error} onRetry={detail.refetch} />;
  const { student, parents, codes } = detail.data;
  const active = student.status === 'active';

  const run = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const newCode = () =>
    run(async () => {
      const ok = await confirmAction(
        'Create a new code?',
        `Give it to one parent only. It works once, with ${student.firstName}'s birth date, and expires after 30 days.`,
        'Create code',
      );
      if (ok) await issue.mutateAsync(id);
    });

  const revokeCode = (c: StudentCode) =>
    run(async () => {
      const ok = await confirmDestructive('Revoke this code?', `${c.code} will stop working. Nobody has used it yet.`, 'Revoke');
      if (ok) await revoke.mutateAsync({ id, codeId: c.id });
    });

  const removeParent = (p: { id: number; name: string }) =>
    run(async () => {
      const ok = await confirmDestructive(
        `Remove ${p.name}?`,
        `They will lose access to ${student.firstName}'s lessons and stop getting notifications right away. They can only reconnect with a new code from you.`,
        'Remove parent',
      );
      if (ok) await remove.mutateAsync({ id, parentId: p.id });
    });

  const share = (c: StudentCode) =>
    Share.share({
      message: `BrightPath code for ${student.firstName}: ${c.code}. Enter it with ${student.firstName}'s birth date in the BrightPath app (Connect a child). It works once and expires ${formatMonthDay(c.expiresAt)}.`,
    }).catch(() => {}); // web browsers without the share sheet: the code is selectable on screen

  return (
    <Screen>
      <Stack.Screen options={{ title: student.fullName }} />
      <Card>
        <ThemedText type="heading">
          {student.avatar} {student.fullName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {sectionName(student.section.grade, student.section.name)} • {student.section.schoolYear}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {student.sex ? `${SEX_LABEL[student.sex]} • ` : ''}Born {formatLongDate(student.birthDate)}, {student.birthDate.slice(0, 4)} • Student ID{' '}
          {student.studentCode}
        </ThemedText>
        {!active && <Badge label="Inactive — hidden from class lists" tone="warning" />}
      </Card>

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}

      <Section title={`Parents (${parents.length})`} subtitle="Everyone who can see this child's lessons and activities.">
        {parents.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No parent is connected yet. Give one parent a code below.
          </ThemedText>
        ) : (
          parents.map((p) => (
            <Card key={p.id}>
              <ThemedText type="smallBold">{p.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" selectable>
                {p.email}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Connected {when(p.connectedAt)}
                {p.code ? ` with code ${p.code}` : ' (before one-time codes)'}
              </ThemedText>
              {p.status !== 'active' && <Badge label={`Account ${p.status}`} tone="warning" />}
              <Button variant="danger" small label="Remove parent" onPress={() => removeParent(p)} loading={remove.isPending && remove.variables?.parentId === p.id} />
            </Card>
          ))
        )}
      </Section>

      <Section
        title="Connection codes"
        subtitle="Each code connects one parent, once. Give each parent their own code; nobody else can use it after them.">
        {active && <Button label="+ New code" onPress={newCode} loading={issue.isPending} />}
        {codes.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            No codes issued yet.
          </ThemedText>
        )}
        {codes.map((c) => (
          <Card key={c.id} tone={c.state === 'active' ? 'successSoft' : 'backgroundElement'}>
            <View style={styles.row}>
              <ThemedText type={c.state === 'active' ? 'heading' : 'smallBold'} selectable style={styles.flex}>
                {c.code}
              </ThemedText>
              <Badge label={CODE_STATE[c.state].label} tone={CODE_STATE[c.state].tone} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {c.state === 'used' && c.usedBy && c.usedAt
                ? `Used by ${c.usedBy.name} on ${when(c.usedAt)}`
                : c.state === 'revoked' && c.revokedAt
                  ? `Revoked ${when(c.revokedAt)}`
                  : c.state === 'expired'
                    ? `Expired ${formatMonthDay(c.expiresAt)}`
                    : `Expires ${formatMonthDay(c.expiresAt)}`}
              {` • made by ${c.createdBy} ${formatMonthDay(c.createdAt)}`}
            </ThemedText>
            {c.state === 'active' && (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Button variant="secondary" small label="Share" onPress={() => share(c)} />
                </View>
                <View style={styles.flex}>
                  <Button
                    variant="danger"
                    small
                    label="Revoke"
                    onPress={() => revokeCode(c)}
                    loading={revoke.isPending && revoke.variables?.codeId === c.id}
                  />
                </View>
              </View>
            )}
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
