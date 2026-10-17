import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { lastSyncLabel, PendantStatus } from '@/components/pendant-status';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import {
  useAdminUser,
  useAssignPendant,
  usePendants,
  useSections,
  useSetAssignments,
  useSubjects,
  useUpdateUser,
} from '@/hooks/admin-queries';
import { useTheme } from '@/hooks/use-theme';
import type { AdminUserDetail, Pendant, UserStatus } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { ROLE_LABEL, roleOptions, STATUS_OPTIONS, STATUS_TONE } from '@/utils/roles';
import { sectionName } from '@/utils/format';

export default function AdminUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useAdminUser(Number(id));

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  // Remount the editor whenever the saved user changes so its local state starts from the server's values.
  const version = `${data.user.role}-${data.user.status}-${data.assignments.map((a) => `${a.sectionId}:${a.subjectId}`).join(',')}`;
  return <UserEditor key={version} data={data} />;
}

type SchoolRole = 'parent' | 'teacher';

function UserEditor({ data }: { data: AdminUserDetail }) {
  const theme = useTheme();
  const { permissions } = useAuth();
  const sections = useSections();
  const subjects = useSubjects();
  const update = useUpdateUser();
  const setAssignments = useSetAssignments();
  const { user } = data;
  const [role, setRole] = useState<SchoolRole>(user.role === 'teacher' ? 'teacher' : 'parent');
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [picked, setPicked] = useState(() => new Set(data.assignments.map((a) => `${a.sectionId}:${a.subjectId}`)));
  // School admins can manage parents/teachers only, and only with the matching permission.
  const canEdit =
    data.editable && !!(user.role === 'teacher' ? permissions?.manage_teachers : permissions?.manage_parents);
  const canChangeRole = canEdit && !!permissions?.manage_teachers;
  const changed = role !== user.role || status !== user.status;
  const [sectionQuery, setSectionQuery] = useState('');
  const activeSections = (sections.data ?? []).filter((s) => s.status === 'active');
  // Schools can have many sections; filter the grid, but always keep sections that already have classes picked.
  const visibleSections = activeSections.filter((s) => {
    const q = sectionQuery.trim().toLowerCase();
    const hasPicked = [...picked].some((k) => k.startsWith(`${s.id}:`));
    return !q || hasPicked || `grade ${s.grade} ${s.name} ${s.schoolYear}`.toLowerCase().includes(q);
  });

  const saveAccess = async () => {
    if (status === 'disabled' && user.status !== 'disabled') {
      const ok = await confirmDestructive('Disable this account?', `${user.displayName} won't be able to sign in. You can re-enable it later.`, 'Disable');
      if (!ok) return;
    }
    update.mutate({ id: user.id, patch: { role, status } });
  };

  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const saveClasses = () =>
    setAssignments.mutate({
      id: user.id,
      assignments: [...picked].map((k) => {
        const [sectionId, subjectId] = k.split(':').map(Number);
        return { sectionId, subjectId };
      }),
    });

  return (
    <Screen>
      <Stack.Screen options={{ title: user.displayName }} />
      <Card style={styles.header}>
        <ThemedText style={styles.avatar}>{user.avatar}</ThemedText>
        <View style={styles.flex}>
          <ThemedText type="heading">{user.displayName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" selectable>
            @{user.username} • {user.email}
          </ThemedText>
          <View style={styles.badges}>
            <Badge label={ROLE_LABEL[user.role]} tone="primary" />
            <Badge label={user.status} tone={STATUS_TONE[user.status]} />
          </View>
        </View>
      </Card>

      {!data.editable && (
        <Card tone="primarySoft">
          <ThemedText type="small">Admin accounts are managed by BrightPath super admins.</ThemedText>
        </Card>
      )}
      {data.editable && !canEdit && (
        <Card tone="primarySoft">
          <ThemedText type="small">
            A super admin hasn&apos;t given you permission to manage {user.role === 'teacher' ? 'teachers' : 'parents'}.
          </ThemedText>
        </Card>
      )}

      {canEdit && user.role === 'teacher' && user.status === 'pending' && (
        <Card tone="warningSoft">
          <ThemedText type="smallBold">This teacher is waiting for approval</ThemedText>
          <Button
            label="Approve teacher"
            loading={update.isPending}
            onPress={() => update.mutate({ id: user.id, patch: { status: 'active' } })}
          />
        </Card>
      )}

      {canEdit && (
      <Card>
        <ThemedText type="subtitle">Access</ThemedText>
        {canChangeRole && (
          <>
            <Select<SchoolRole> label="Role" options={roleOptions<SchoolRole>(['parent', 'teacher'])} value={role} onChange={setRole} />
          </>
        )}
        <Select<UserStatus> label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <ThemedText type="caption" themeColor="textSecondary">
          Accounts are never deleted — disable them instead. Disabled accounts can be re-enabled.
        </ThemedText>
        {update.error && (
          <ThemedText type="caption" themeColor="danger">
            {update.error.message}
          </ThemedText>
        )}
        <Button label="Save access" onPress={saveAccess} loading={update.isPending} disabled={!changed} />
      </Card>
      )}

      {canEdit && user.role === 'teacher' && user.status === 'active' && (
        <Card>
          <ThemedText type="subtitle">Classes</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Teachers can only post lessons and activities for the classes picked here. Removing a class turns it off but
            keeps the teacher&apos;s past lessons.
          </ThemedText>
          {activeSections.length > 4 && (
            <TextField
              label="Find a section"
              placeholder="Search grade, section or year"
              value={sectionQuery}
              onChangeText={setSectionQuery}
              autoCorrect={false}
            />
          )}
          {visibleSections.map((sec) => (
            <View key={sec.id} style={styles.gap}>
              <ThemedText type="smallBold">
                {sectionName(sec.grade, sec.name)} • {sec.schoolYear}
              </ThemedText>
              <View style={styles.wrap}>
                {(subjects.data ?? []).map((sub) => {
                  const key = `${sec.id}:${sub.id}`;
                  const on = picked.has(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggle(key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${sub.name}, ${sectionName(sec.grade, sec.name)}`}
                      style={[
                        styles.pill,
                        { borderColor: on ? sub.color : theme.border, backgroundColor: on ? `${sub.color}22` : 'transparent' },
                      ]}>
                      <ThemedText type="caption" style={{ color: on ? sub.color : theme.textSecondary, fontWeight: 700 }}>
                        {on ? '✓ ' : ''}
                        {sub.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {setAssignments.error && (
            <ThemedText type="caption" themeColor="danger">
              {setAssignments.error.message}
            </ThemedText>
          )}
          <Button label="Save classes" onPress={saveClasses} loading={setAssignments.isPending} />
          {setAssignments.isSuccess && (
            <ThemedText type="caption" themeColor="success">
              Classes saved.
            </ThemedText>
          )}
        </Card>
      )}

      {user.role === 'teacher' && user.status === 'active' && (
        <TeacherPendantCard userId={user.id} pendant={data.pendant} canManage={!!permissions?.manage_teachers} />
      )}

      {user.role === 'parent' && (
        <Card>
          <ThemedText type="subtitle">Connected children</ThemedText>
          {data.children.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              None yet.
            </ThemedText>
          ) : (
            data.children.map((c) => (
              <ThemedText key={c.id} type="small">
                {c.fullName} — {sectionName(c.grade, c.section)}
              </ThemedText>
            ))
          )}
        </Card>
      )}
    </Screen>
  );
}

const NO_PENDANT = 'none';

/** The pendant this teacher wears, with a dropdown to give, swap or take it back. */
function TeacherPendantCard({ userId, pendant, canManage }: { userId: number; pendant: Pendant | null; canManage: boolean }) {
  const pendants = usePendants();
  const assign = useAssignPendant();
  // A teacher can only be given a free pendant (or keep their own); others must be taken back first.
  const options = [
    { value: NO_PENDANT, label: 'No pendant', description: pendant ? `Take back ${pendant.code}` : undefined },
    ...(pendants.data ?? [])
      .filter((p) => !p.teacher || p.id === pendant?.id)
      .map((p) => ({
        value: String(p.id),
        label: p.code,
        description: `${lastSyncLabel(p)}${p.id === pendant?.id ? ' • current' : ''}`,
      })),
  ];

  const change = async (value: string) => {
    const pendantId = value === NO_PENDANT ? null : Number(value);
    if (pendantId === (pendant?.id ?? null)) return;
    if (pendant && !(await confirmDestructive(
      pendantId ? `Swap ${pendant.code}?` : `Take back ${pendant.code}?`,
      pendantId ? `${pendant.code} goes back to the pool and this teacher gets the new one.` : 'This teacher will have no pendant until you give them one.',
      pendantId ? 'Swap' : 'Take back',
    ))) {
      return;
    }
    assign.mutate({ userId, pendantId });
  };

  return (
    <Card>
      <ThemedText type="subtitle">Recording pendant</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        The teacher wears it to record lessons. Only this teacher and school admins see its status.
      </ThemedText>
      {pendant ? (
        <PendantStatus pendant={pendant} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No pendant assigned.
        </ThemedText>
      )}
      {canManage && (
        <Select
          label={pendant ? 'Change pendant' : 'Give a pendant'}
          placeholder={pendants.isLoading ? 'Loading pendants…' : 'Choose a pendant'}
          options={options}
          value={pendant ? String(pendant.id) : NO_PENDANT}
          onChange={change}
          emptyText="No free pendants. Register one or take one back on the Pendants tab."
        />
      )}
      {canManage && options.length === 1 && !pendant && (
        <ThemedText type="caption" themeColor="textSecondary">
          No free pendants. Register one or take one back on the Pendants tab.
        </ThemedText>
      )}
      {assign.error && (
        <ThemedText type="caption" themeColor="danger">
          {assign.error.message}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { fontSize: 40, lineHeight: 50 },
  flex: { flex: 1, gap: Spacing.one },
  badges: { flexDirection: 'row', gap: Spacing.two },
  gap: { gap: Spacing.two, marginTop: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2 },
});
