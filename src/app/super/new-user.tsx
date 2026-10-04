import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { useSchools, useSuperCreateUser } from '@/hooks/super-queries';
import { ApiError } from '@/services/api';
import type { Role } from '@/types/api';

// Same rule as the server: no '@', so login can tell usernames from emails.
const USERNAME = /^[a-z0-9._]{3,30}$/;

/** Super admins can create any account: school admins (per school), teachers, parents, or other super admins. */
export default function SuperNewUserScreen() {
  const schools = useSchools();
  const create = useSuperCreateUser();
  const [role, setRole] = useState<Role>('admin');
  const [schoolId, setSchoolId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const needsSchool = role === 'admin' || role === 'teacher';
  const usernameValid = USERNAME.test(username.trim().toLowerCase());

  const submit = async () => {
    setError(undefined);
    try {
      const { user } = await create.mutateAsync({
        role,
        displayName: displayName.trim(),
        email: email.trim(),
        username: username.trim().toLowerCase(),
        password,
        schoolId: needsSchool ? Number(schoolId) : undefined,
      });
      router.replace({ pathname: '/super/user/[id]', params: { id: String(user.id) } });
    } catch (e) {
      setError(e instanceof ApiError && e.details ? e.details.map((d) => d.message).join('\n') : (e as Error).message);
    }
  };

  return (
    <Screen>
      <ThemedText type="smallBold">Role</ThemedText>
      <Chips<Role>
        options={[
          { value: 'admin', label: 'School admin' },
          { value: 'teacher', label: 'Teacher' },
          { value: 'parent', label: 'Parent' },
          { value: 'super_admin', label: 'Super admin' },
        ]}
        value={role}
        onChange={setRole}
      />
      {role === 'super_admin' && (
        <ThemedText type="small" themeColor="warning">
          Super admins can manage every school and account.
        </ThemedText>
      )}
      {needsSchool && (
        <Select
          label="School"
          placeholder="Choose a school"
          searchPlaceholder="Search schools"
          options={(schools.data ?? []).filter((s) => s.status === 'active').map((s) => ({ value: String(s.id), label: s.name }))}
          value={schoolId}
          onChange={setSchoolId}
        />
      )}
      <TextField label="Name" value={displayName} onChangeText={setDisplayName} maxLength={80} />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextField
        label="Username"
        placeholder="e.g. juan.delacruz"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        error={username && !usernameValid ? '3–30 letters, numbers, dots or underscores' : undefined}
      />
      <TextField
        label="Temporary password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        error={password && password.length < 8 ? 'At least 8 characters' : undefined}
      />
      <ThemedText type="caption" themeColor="textSecondary">
        New school admins get all permissions; adjust them on the next screen.
      </ThemedText>
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
      <Button
        label="Create account"
        onPress={submit}
        loading={create.isPending}
        disabled={!displayName.trim() || !email.trim() || !usernameValid || password.length < 8 || (needsSchool && !schoolId)}
      />
    </Screen>
  );
}
