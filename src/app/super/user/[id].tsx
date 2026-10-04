import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chips } from '@/components/ui/chips';
import { ListRow } from '@/components/ui/list-row';
import { ErrorState, Loading } from '@/components/ui/query-state';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useSchools, useSetPermissions, useSuperUpdateUser, useSuperUser } from '@/hooks/super-queries';
import { useTheme } from '@/hooks/use-theme';
import type { Permission, Role, SuperUserDetail, UserStatus } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';
import { PERMISSION_LABEL, ROLE_LABEL, STATUS_TONE } from '@/utils/roles';

const SCHOOL_ROLES: Role[] = ['teacher', 'admin'];

export default function SuperUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useSuperUser(Number(id));

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  // Remount when the saved account changes so the form starts from the server's values.
  const version = `${data.user.role}-${data.user.status}-${data.user.school?.id ?? 0}`;
  return <UserEditor key={version} data={data} />;
}

function UserEditor({ data }: { data: SuperUserDetail }) {
  const theme = useTheme();
  const { user: me } = useAuth();
  const schools = useSchools();
  const update = useSuperUpdateUser();
  const setPermissions = useSetPermissions();
  const { user, permissions } = data;
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [schoolId, setSchoolId] = useState(user.school ? String(user.school.id) : '');
  const isSelf = user.id === me?.id;
  const needsSchool = SCHOOL_ROLES.includes(role);
  const changed = role !== user.role || status !== user.status || (needsSchool && schoolId !== String(user.school?.id ?? ''));

  const save = async () => {
    if (role === 'super_admin' && user.role !== 'super_admin') {
      const ok = await confirmDestructive('Make this user a super admin?', 'Super admins can manage every school and account.', 'Make super admin');
      if (!ok) return;
    }
    if (status === 'disabled' && user.status !== 'disabled') {
      const ok = await confirmDestructive('Disable this account?', `${user.displayName} won't be able to sign in. You can re-enable it later.`, 'Disable');
      if (!ok) return;
    }
    update.mutate({ id: user.id, patch: { role, status, schoolId: needsSchool ? Number(schoolId) : null } });
  };

  const togglePermission = (p: Permission, value: boolean) => setPermissions.mutate({ id: user.id, patch: { [p]: value } });

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
          {user.school && <ThemedText type="small">{user.school.name}</ThemedText>}
          <View style={styles.badges}>
            <Badge label={ROLE_LABEL[user.role]} tone="primary" />
            <Badge label={user.status} tone={STATUS_TONE[user.status]} />
          </View>
        </View>
      </Card>

      {user.role === 'admin' && user.status === 'pending' && (
        <Card tone="warningSoft">
          <ThemedText type="smallBold">
            Requested school admin access for {user.school?.name ?? 'a school'}
          </ThemedText>
          <Button
            label="Approve school admin"
            loading={update.isPending}
            onPress={() => update.mutate({ id: user.id, patch: { status: 'active' } })}
          />
        </Card>
      )}

      <Card>
        <ThemedText type="subtitle">Access</ThemedText>
        {isSelf ? (
          <ThemedText type="caption" themeColor="textSecondary">
            You can&apos;t change your own role or status.
          </ThemedText>
        ) : (
          <>
            <ThemedText type="smallBold">Role</ThemedText>
            <Chips<Role>
              options={[
                { value: 'parent', label: 'Parent' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'admin', label: 'School admin' },
                { value: 'super_admin', label: 'Super admin' },
              ]}
              value={role}
              onChange={setRole}
            />
            {needsSchool && (
              <Select
                label="School"
                placeholder="Choose a school"
                searchPlaceholder="Search schools"
                options={(schools.data ?? [])
                  .filter((s) => s.status === 'active')
                  .map((s) => ({ value: String(s.id), label: s.name }))}
                value={schoolId}
                onChange={setSchoolId}
              />
            )}
            <ThemedText type="smallBold">Status</ThemedText>
            <Chips<UserStatus>
              options={[
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'disabled', label: 'Disabled' },
              ]}
              value={status}
              onChange={setStatus}
            />
            <ThemedText type="caption" themeColor="textSecondary">
              Accounts are never deleted — disable them instead.
            </ThemedText>
            {update.error && (
              <ThemedText type="caption" themeColor="danger">
                {update.error.message}
              </ThemedText>
            )}
            <Button
              label="Save access"
              onPress={save}
              loading={update.isPending}
              disabled={!changed || (needsSchool && !schoolId)}
            />
          </>
        )}
      </Card>

      {user.role === 'admin' && permissions && (
        <Card>
          <ThemedText type="subtitle">School admin permissions</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            What this admin can do inside {user.school?.name ?? 'their school'}. Changes apply immediately.
          </ThemedText>
          {(Object.keys(PERMISSION_LABEL) as Permission[]).map((p) => (
            <ListRow
              key={p}
              title={PERMISSION_LABEL[p].title}
              subtitle={PERMISSION_LABEL[p].subtitle}
              right={
                <Switch
                  value={permissions[p]}
                  onValueChange={(v) => togglePermission(p, v)}
                  disabled={setPermissions.isPending}
                  trackColor={{ true: theme.primary }}
                  accessibilityLabel={PERMISSION_LABEL[p].title}
                />
              }
            />
          ))}
          {setPermissions.error && (
            <ThemedText type="caption" themeColor="danger">
              {setPermissions.error.message}
            </ThemedText>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { fontSize: 40, lineHeight: 50 },
  flex: { flex: 1, gap: Spacing.one },
  badges: { flexDirection: 'row', gap: Spacing.two },
});
