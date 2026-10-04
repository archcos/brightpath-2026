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
import { useAuth } from '@/context/auth-context';
import {
  useAdminUsers,
  useCreateSection,
  useSections,
  useStudents,
  useUpdateSection,
  useUpdateStudent,
} from '@/hooks/admin-queries';
import type { AdminStudent, Permissions } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { formatMonthDay } from '@/utils/format';
import { currentSchoolYear, ROLE_LABEL, STATUS_TONE } from '@/utils/roles';

type Tab = 'users' | 'students' | 'sections';
type UserFilter = 'pending' | 'all' | 'teacher' | 'parent' | 'admin';

const NO_PERMISSIONS: Permissions = {
  manage_teachers: false,
  manage_parents: false,
  manage_students: false,
  manage_sections: false,
};

export default function AdminHome() {
  const { user, permissions } = useAuth();
  const perms = permissions ?? NO_PERMISSIONS;
  const [tab, setTab] = useState<Tab>('users');

  return (
    <Screen tab>
      <StaffHeader title={user?.school?.name ?? 'School Admin'} subtitle="Manage your school's accounts, students and sections." />
      <Chips<Tab>
        options={[
          { value: 'users', label: 'Users' },
          { value: 'students', label: 'Students' },
          { value: 'sections', label: 'Sections' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'users' ? <UsersTab perms={perms} /> : tab === 'students' ? <StudentsTab perms={perms} /> : <SectionsTab perms={perms} />}
    </Screen>
  );
}

function ReadOnlyNote({ what }: { what: string }) {
  return (
    <ThemedText type="caption" themeColor="textSecondary">
      You can view {what}, but a super admin hasn&apos;t given you permission to change them.
    </ThemedText>
  );
}

function UsersTab({ perms }: { perms: Permissions }) {
  const [filter, setFilter] = useState<UserFilter>('pending');
  const [q, setQ] = useState('');
  const { data, isLoading, error, refetch } = useAdminUsers({
    status: filter === 'pending' ? 'pending' : undefined,
    role: filter === 'pending' || filter === 'all' ? undefined : filter,
    q: q.trim() || undefined,
  });
  const canCreate = perms.manage_teachers || perms.manage_parents;

  return (
    <View style={styles.gap}>
      {canCreate && <Button label="+ New teacher or parent" onPress={() => router.push('/admin/new-user')} />}
      <Chips<UserFilter>
        options={[
          { value: 'pending', label: 'Pending approval' },
          { value: 'all', label: 'All' },
          { value: 'teacher', label: 'Teachers' },
          { value: 'parent', label: 'Parents' },
          { value: 'admin', label: 'Admins' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <TextField label="Search" placeholder="Name or email" value={q} onChangeText={setQ} autoCapitalize="none" />
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'No accounts waiting for approval' : 'No users found'} />
      ) : (
        data.map((u) => (
          <Card
            key={u.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/admin/user/[id]', params: { id: String(u.id) } })}
            accessibilityLabel={`${u.displayName}, ${ROLE_LABEL[u.role]}, ${u.status}`}>
            <ThemedText style={styles.avatar}>{u.avatar}</ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{u.displayName}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                @{u.username} • {u.email} • joined {formatMonthDay(u.createdAt)}
              </ThemedText>
            </View>
            <View style={styles.badges}>
              <Badge label={ROLE_LABEL[u.role]} tone="primary" />
              <Badge label={u.status} tone={STATUS_TONE[u.status]} />
            </View>
          </Card>
        ))
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        Parents appear here once they connect a child at your school. Admin accounts are managed by super admins.
      </ThemedText>
    </View>
  );
}

function StudentsTab({ perms }: { perms: Permissions }) {
  const sections = useSections();
  const update = useUpdateStudent();
  const [sectionId, setSectionId] = useState('all');
  const [status, setStatus] = useState<AdminStudent['status']>('active');
  const { data, isLoading, error, refetch } = useStudents({
    sectionId: sectionId === 'all' ? undefined : Number(sectionId),
    status,
  });

  const toggle = async (s: AdminStudent) => {
    const deactivate = s.status === 'active';
    if (deactivate && !(await confirmDestructive('Mark student inactive?', `${s.firstName} will be hidden from class lists and notifications. You can reactivate them later.`, 'Mark inactive'))) {
      return;
    }
    update.mutate({ id: s.id, patch: { status: deactivate ? 'inactive' : 'active' } });
  };

  return (
    <View style={styles.gap}>
      {perms.manage_students ? (
        <Button label="+ New student" onPress={() => router.push('/admin/new-student')} />
      ) : (
        <ReadOnlyNote what="students" />
      )}
      <Chips<AdminStudent['status']>
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ]}
        value={status}
        onChange={setStatus}
      />
      <Select
        label="Section"
        searchPlaceholder="Search grade, section or year"
        options={[
          { value: 'all', label: 'All sections' },
          ...(sections.data ?? [])
            .filter((s) => s.status === 'active')
            .map((s) => ({ value: String(s.id), label: `Grade ${s.grade} • ${s.name}`, description: `School year ${s.schoolYear}` })),
        ]}
        value={sectionId}
        onChange={setSectionId}
      />
      {update.error && (
        <ThemedText type="caption" themeColor="danger">
          {update.error.message}
        </ThemedText>
      )}
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState title={status === 'active' ? 'No active students' : 'No inactive students'} />
      ) : (
        data.map((s) => (
          <Card key={s.id}>
            <View style={styles.row}>
              <ThemedText style={styles.avatar}>{s.avatar}</ThemedText>
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  {s.firstName} {s.lastName}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Grade {s.section.grade} • {s.section.name} • {s.section.schoolYear} • born {s.birthDate}
                </ThemedText>
                <ThemedText type="code" selectable>
                  {s.studentCode}
                </ThemedText>
              </View>
              <Badge label={`${s.parents} parent${s.parents === 1 ? '' : 's'}`} tone={s.parents ? 'success' : 'neutral'} />
            </View>
            {perms.manage_students && (
              <Button
                small
                variant={s.status === 'active' ? 'ghost' : 'secondary'}
                label={s.status === 'active' ? 'Mark inactive' : 'Reactivate'}
                onPress={() => toggle(s)}
                loading={update.isPending && update.variables?.id === s.id}
              />
            )}
          </Card>
        ))
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        Give parents the student code and confirm the birth date — they need both to connect.
      </ThemedText>
    </View>
  );
}

function SectionsTab({ perms }: { perms: Permissions }) {
  const { data, isLoading, error, refetch } = useSections();
  const create = useCreateSection();
  const update = useUpdateSection();
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());

  const add = async () => {
    await create.mutateAsync({ grade: Number(grade), name: name.trim(), schoolYear: schoolYear.trim() });
    setGrade('');
    setName('');
  };

  const toggle = async (id: number, archived: boolean, label: string) => {
    if (!archived && !(await confirmDestructive('Archive section?', `${label} will be hidden from new classes. Its lessons and students are kept.`, 'Archive'))) {
      return;
    }
    update.mutate({ id, patch: { status: archived ? 'active' : 'archived' } });
  };

  // Group by school year, newest first.
  const years = [...new Set((data ?? []).map((s) => s.schoolYear))].sort().reverse();

  return (
    <View style={styles.gap}>
      {!perms.manage_sections && <ReadOnlyNote what="sections" />}
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
        years.map((year) => (
          <View key={year} style={styles.gap}>
            <ThemedText type="subtitle">School year {year}</ThemedText>
            {data
              .filter((s) => s.schoolYear === year)
              .map((s) => {
                const label = `Grade ${s.grade} • ${s.name}`;
                const archived = s.status === 'archived';
                return (
                  <Card key={s.id} style={styles.row}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{label}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        Adviser: {s.adviser ?? '—'} • {s.students} active students
                      </ThemedText>
                    </View>
                    <View style={styles.badges}>
                      <Badge label={archived ? 'Archived' : 'Active'} tone={archived ? 'neutral' : 'success'} />
                      {perms.manage_sections && (
                        <Button
                          small
                          variant="ghost"
                          label={archived ? 'Restore' : 'Archive'}
                          onPress={() => toggle(s.id, archived, label)}
                        />
                      )}
                    </View>
                  </Card>
                );
              })}
          </View>
        ))
      )}
      {perms.manage_sections && (
        <Card>
          <ThemedText type="subtitle">Add section</ThemedText>
          <View style={styles.formRow}>
            <View style={styles.gradeField}>
              <TextField label="Grade" keyboardType="number-pad" value={grade} onChangeText={setGrade} maxLength={2} />
            </View>
            <View style={styles.flex}>
              <TextField label="Section name" value={name} onChangeText={setName} maxLength={80} />
            </View>
          </View>
          <TextField label="School year" placeholder="2026-2027" value={schoolYear} onChangeText={setSchoolYear} maxLength={9} />
          {create.error && (
            <ThemedText type="caption" themeColor="danger">
              {create.error.message}
            </ThemedText>
          )}
          <Button
            label="Add section"
            onPress={add}
            loading={create.isPending}
            disabled={!grade || !name.trim() || !/^\d{4}-\d{4}$/.test(schoolYear.trim())}
          />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  avatar: { fontSize: 26, lineHeight: 34 },
  badges: { gap: Spacing.one, alignItems: 'flex-end' },
  formRow: { flexDirection: 'row', gap: Spacing.two },
  gradeField: { width: 90 },
});
