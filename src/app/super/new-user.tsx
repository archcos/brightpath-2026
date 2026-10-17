import { router } from 'expo-router';
import { useState } from 'react';

import { EMPTY_NAME, isNameComplete, NameFields, toPersonName } from '@/components/name-fields';
import { SexField } from '@/components/sex-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { useSchools, useSuperCreateUser } from '@/hooks/super-queries';
import { errorMessage } from '@/services/api';
import type { Role, Sex } from '@/types/api';
import { roleOptions } from '@/utils/roles';

// Same rule as the server: no '@', so login can tell usernames from emails.
const USERNAME = /^[a-z0-9._]{3,30}$/;

/** Super admins can create any account: school admins (per school), teachers, parents, or other super admins. */
export default function SuperNewUserScreen() {
  const schools = useSchools();
  const create = useSuperCreateUser();
  const [role, setRole] = useState<Role>('admin');
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState(EMPTY_NAME);
  const [sex, setSex] = useState<Sex | ''>('');
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
        ...toPersonName(name),
        sex: sex as Sex,
        email: email.trim(),
        username: username.trim().toLowerCase(),
        password,
        schoolId: needsSchool ? Number(schoolId) : undefined,
      });
      router.replace({ pathname: '/super/user/[id]', params: { id: String(user.id) } });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <Select<Role>
        label="Role"
        options={roleOptions<Role>(['admin', 'teacher', 'parent', 'super_admin'])}
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
      <NameFields value={name} onChange={setName} />
      <SexField value={sex} onChange={setSex} />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={255} />
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
        disabled={!isNameComplete(name) || !sex || !email.trim() || !usernameValid || password.length < 8 || (needsSchool && !schoolId)}
      />
    </Screen>
  );
}
