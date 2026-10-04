import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StaffHeader } from '@/components/staff-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useCreateSchool, useSchools, useSuperUsers, useUpdateSchool } from '@/hooks/super-queries';
import type { Role, School, User, UserStatus } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { formatMonthDay } from '@/utils/format';
import { ROLE_LABEL, STATUS_TONE } from '@/utils/roles';

type Tab = 'schools' | 'admins' | 'users';

export default function SuperHome() {
  const [tab, setTab] = useState<Tab>('admins');
  return (
    <Screen tab>
      <StaffHeader title="BrightPath Admin" subtitle="Schools, school admins and permissions." />
      <Chips<Tab>
        options={[
          { value: 'admins', label: 'School admins' },
          { value: 'schools', label: 'Schools' },
          { value: 'users', label: 'All users' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'schools' ? <SchoolsTab /> : tab === 'admins' ? <AdminsTab /> : <UsersTab />}
    </Screen>
  );
}

function UserRow({ user }: { user: User }) {
  return (
    <Card
      style={styles.row}
      onPress={() => router.push({ pathname: '/super/user/[id]', params: { id: String(user.id) } })}
      accessibilityLabel={`${user.displayName}, ${ROLE_LABEL[user.role]}, ${user.status}`}>
      <ThemedText style={styles.avatar}>{user.avatar}</ThemedText>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{user.displayName}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          @{user.username} • {user.email}
          {user.school ? ` • ${user.school.name}` : ''} • joined {formatMonthDay(user.createdAt)}
        </ThemedText>
      </View>
      <View style={styles.badges}>
        <Badge label={ROLE_LABEL[user.role]} tone="primary" />
        <Badge label={user.status} tone={STATUS_TONE[user.status]} />
      </View>
    </Card>
  );
}

function AdminsTab() {
  const [status, setStatus] = useState<UserStatus | 'all'>('pending');
  const { data, isLoading, error, refetch } = useSuperUsers({ role: 'admin', status: status === 'all' ? undefined : status });
  return (
    <View style={styles.gap}>
      <Button label="+ New account" onPress={() => router.push('/super/new-user')} />
      <Chips<UserStatus | 'all'>
        options={[
          { value: 'pending', label: 'Awaiting approval' },
          { value: 'active', label: 'Active' },
          { value: 'disabled', label: 'Disabled' },
          { value: 'all', label: 'All' },
        ]}
        value={status}
        onChange={setStatus}
      />
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState title={status === 'pending' ? 'No admin requests waiting' : 'No school admins'} />
      ) : (
        data.map((u) => <UserRow key={u.id} user={u} />)
      )}
    </View>
  );
}

function UsersTab() {
  const schools = useSchools();
  const [role, setRole] = useState<Role | 'all'>('all');
  const [schoolId, setSchoolId] = useState('all');
  const [q, setQ] = useState('');
  const { data, isLoading, error, refetch } = useSuperUsers({
    role: role === 'all' ? undefined : role,
    schoolId: schoolId === 'all' ? undefined : Number(schoolId),
    q: q.trim() || undefined,
  });
  return (
    <View style={styles.gap}>
      <Chips<Role | 'all'>
        options={[
          { value: 'all', label: 'All roles' },
          { value: 'super_admin', label: 'Super admins' },
          { value: 'admin', label: 'School admins' },
          { value: 'teacher', label: 'Teachers' },
          { value: 'parent', label: 'Parents' },
        ]}
        value={role}
        onChange={setRole}
      />
      <Select
        label="School"
        searchPlaceholder="Search schools"
        options={[
          { value: 'all', label: 'All schools' },
          ...(schools.data ?? []).map((s) => ({
            value: String(s.id),
            label: s.name,
            description: s.status === 'active' ? undefined : 'Inactive',
          })),
        ]}
        value={schoolId}
        onChange={setSchoolId}
      />
      <TextField label="Search" placeholder="Name or email" value={q} onChangeText={setQ} autoCapitalize="none" />
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        data.map((u) => <UserRow key={u.id} user={u} />)
      )}
    </View>
  );
}

function SchoolsTab() {
  const { data, isLoading, error, refetch } = useSchools();
  const create = useCreateSchool();
  const update = useUpdateSchool();
  const [name, setName] = useState('');

  const toggle = async (s: School) => {
    const deactivate = s.status === 'active';
    if (
      deactivate &&
      !(await confirmDestructive(
        'Deactivate school?',
        `${s.name}'s admins and teachers lose access until it's reactivated. Nothing is deleted.`,
        'Deactivate',
      ))
    ) {
      return;
    }
    update.mutate({ id: s.id, patch: { status: deactivate ? 'inactive' : 'active' } });
  };

  const add = async () => {
    await create.mutateAsync(name.trim());
    setName('');
  };

  return (
    <View style={styles.gap}>
      {update.error && (
        <ThemedText type="caption" themeColor="danger">
          {update.error.message}
        </ThemedText>
      )}
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        data.map((s) => (
          <Card key={s.id}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{s.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {s.admins} admin{s.admins === 1 ? '' : 's'} • {s.teachers} teachers • {s.students} students
                </ThemedText>
              </View>
              <View style={styles.badges}>
                <Badge label={s.status} tone={s.status === 'active' ? 'success' : 'neutral'} />
                {s.pendingAdmins > 0 && <Badge label={`${s.pendingAdmins} admin request${s.pendingAdmins === 1 ? '' : 's'}`} tone="warning" />}
              </View>
            </View>
            <Button
              small
              variant={s.status === 'active' ? 'ghost' : 'secondary'}
              label={s.status === 'active' ? 'Deactivate school' : 'Reactivate school'}
              onPress={() => toggle(s)}
              loading={update.isPending && update.variables?.id === s.id}
            />
          </Card>
        ))
      )}
      <Card>
        <ThemedText type="subtitle">Add school</ThemedText>
        <TextField label="School name" value={name} onChangeText={setName} maxLength={160} />
        {create.error && (
          <ThemedText type="caption" themeColor="danger">
            {create.error.message}
          </ThemedText>
        )}
        <Button label="Add school" onPress={add} loading={create.isPending} disabled={!name.trim()} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  avatar: { fontSize: 26, lineHeight: 34 },
  badges: { gap: Spacing.one, alignItems: 'flex-end' },
});
