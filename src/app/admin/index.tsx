import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { PendantStatus } from '@/components/pendant-status';
import { StaffHeader } from '@/components/staff-header';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { FilterRow, Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useAdminUsers,
  useCreateSection,
  useNewPendantKey,
  usePendants,
  useRegisterPendant,
  useSections,
  useStudents,
  useTakeBackPendant,
  useUpdateSection,
  useUpdateStudent,
} from '@/hooks/admin-queries';
import type { AdminStudent, Pendant, Permissions } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { formatMonthDay, plural } from '@/utils/format';
import { currentSchoolYear, ROLE_LABEL, STATUS_TONE } from '@/utils/roles';

type Tab = 'users' | 'students' | 'sections' | 'pendants';
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
      <StaffHeader
        title={user?.school?.name ?? 'School Admin'}
        subtitle="Manage your school's accounts, students, sections and recording pendants."
      />
      <Segmented<Tab>
        options={[
          { value: 'users', label: 'Users' },
          { value: 'students', label: 'Students' },
          { value: 'sections', label: 'Sections' },
          { value: 'pendants', label: 'Pendants' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'users' ? (
        <UsersTab perms={perms} />
      ) : tab === 'students' ? (
        <StudentsTab perms={perms} />
      ) : tab === 'sections' ? (
        <SectionsTab perms={perms} />
      ) : (
        <PendantsTab perms={perms} />
      )}
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
  const search = useDebouncedValue(q.trim());
  const { data, isLoading, error, refetch } = useAdminUsers({
    status: filter === 'pending' ? 'pending' : undefined,
    role: filter === 'pending' || filter === 'all' ? undefined : filter,
    q: search || undefined,
  });
  const canCreate = perms.manage_teachers || perms.manage_parents;

  return (
    <View style={styles.gap}>
      {canCreate && <Button label="+ New teacher or parent" onPress={() => router.push('/admin/new-user')} />}
      <Select<UserFilter>
        label="Show"
        options={[
          { value: 'pending', label: 'Waiting for approval' },
          { value: 'all', label: 'All users' },
          { value: 'teacher', label: 'Teachers' },
          { value: 'parent', label: 'Parents' },
          { value: 'admin', label: 'School admins' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <TextField label="Search" placeholder="Name, username or email" value={q} onChangeText={setQ} autoCapitalize="none" />
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
      <FilterRow>
        <Select
          compact
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
        <Select<AdminStudent['status']>
          compact
          label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={status}
          onChange={setStatus}
        />
      </FilterRow>
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
    try {
      await create.mutateAsync({ grade: Number(grade), name: name.trim(), schoolYear: schoolYear.trim() });
      setGrade('');
      setName('');
    } catch {
      // Shown below via create.error.
    }
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
      ) : years.length === 0 ? (
        <EmptyState
          title="No sections yet"
          message={perms.manage_sections ? 'Add your first section below.' : 'A school admin with permission can add sections.'}
        />
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
                        Adviser: {s.adviser ?? '—'} • {plural(s.students, 'active student')}
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

/** The school's recording pendants: who wears each one, its status, and registering new ones. */
function PendantsTab({ perms }: { perms: Permissions }) {
  const { data, isLoading, error, refetch } = usePendants();
  const register = useRegisterPendant();
  const takeBack = useTakeBackPendant();
  const newKey = useNewPendantKey();
  const [code, setCode] = useState('');
  // The server returns a device key only once; it's kept here until the admin leaves the tab.
  const [shownKey, setShownKey] = useState<{ code: string; key: string }>();
  const canManage = perms.manage_teachers;
  const available = (data ?? []).filter((p) => !p.teacher).length;

  const add = async () => {
    try {
      const { pendant } = await register.mutateAsync(code.trim().toUpperCase());
      setShownKey({ code: pendant.code, key: pendant.deviceKey });
      setCode('');
    } catch {
      // Shown below via register.error.
    }
  };

  const confirmNewKey = async (p: Pendant) => {
    const ok = await confirmDestructive(
      `New upload key for ${p.code}?`,
      'The old key stops working right away. Put the new key into the pendant so it can keep uploading lessons.',
      'New key',
    );
    if (!ok) return;
    try {
      const { deviceKey } = await newKey.mutateAsync(p.id);
      setShownKey({ code: p.code, key: deviceKey });
    } catch {
      // Shown above via newKey.error.
    }
  };

  const confirmTakeBack = async (p: Pendant) => {
    if (
      await confirmDestructive(
        `Take back ${p.code}?`,
        `${p.teacher?.name ?? 'The teacher'} will no longer have a pendant until you give them one again.`,
        'Take back',
      )
    ) {
      takeBack.mutate(p.id);
    }
  };

  return (
    <View style={styles.gap}>
      <ThemedText type="small" themeColor="textSecondary">
        Each teacher wears one pendant to record their lessons. Give a teacher a pendant from their user page.
        Parents never see pendants.
      </ThemedText>
      {!canManage && <ReadOnlyNote what="pendants" />}
      {(takeBack.error || newKey.error) && (
        <ThemedText type="caption" themeColor="danger">
          {(takeBack.error ?? newKey.error)!.message}
        </ThemedText>
      )}
      {shownKey && (
        <Card tone="warningSoft">
          <ThemedText type="smallBold">Upload key for {shownKey.code}</ThemedText>
          <ThemedText type="small" selectable style={styles.key}>
            {shownKey.key}
          </ThemedText>
          <ThemedText type="caption">
            Copy it into the pendant&apos;s settings now. It won&apos;t be shown again; if it&apos;s lost, make a new key.
          </ThemedText>
          <Button small variant="secondary" label="Done" onPress={() => setShownKey(undefined)} />
        </Card>
      )}
      {isLoading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState title="No pendants yet" message={canManage ? 'Register your first pendant below.' : undefined} />
      ) : (
        <>
          <ThemedText type="caption" themeColor="textSecondary">
            {plural(data.length, 'pendant')} • {available} available
          </ThemedText>
          {data.map((p) => (
            <Card key={p.id}>
              <PendantStatus pendant={p} />
              <View style={styles.row}>
                <ThemedText type="small" style={styles.flex}>
                  {p.teacher ? `Worn by ${p.teacher.name}` : 'Available — not assigned to anyone'}
                </ThemedText>
                {p.teacher?.userId && (
                  <Button
                    small
                    variant="secondary"
                    label="Teacher"
                    onPress={() => router.push({ pathname: '/admin/user/[id]', params: { id: String(p.teacher!.userId) } })}
                  />
                )}
                {canManage && (
                  <Button
                    small
                    variant="ghost"
                    label="New key"
                    onPress={() => confirmNewKey(p)}
                    loading={newKey.isPending && newKey.variables === p.id}
                  />
                )}
                {p.teacher && canManage && (
                  <Button
                    small
                    variant="ghost"
                    label="Take back"
                    onPress={() => confirmTakeBack(p)}
                    loading={takeBack.isPending && takeBack.variables === p.id}
                  />
                )}
              </View>
            </Card>
          ))}
        </>
      )}
      {canManage && (
        <Card>
          <ThemedText type="subtitle">Register a pendant</ThemedText>
          <TextField
            label="Pendant code"
            placeholder="e.g. TP-004 (printed on the device)"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />
          {register.error && (
            <ThemedText type="caption" themeColor="danger">
              {register.error.message}
            </ThemedText>
          )}
          <Button label="Register pendant" onPress={add} loading={register.isPending} disabled={code.trim().length < 3} />
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
  key: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
