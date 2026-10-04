import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { useCreateUser } from '@/hooks/admin-queries';
import { ApiError } from '@/services/api';

type SchoolRole = 'teacher' | 'parent';

// Same rule as the server: no '@', so login can tell usernames from emails.
const USERNAME = /^[a-z0-9._]{3,30}$/;

/** School admins create teacher or parent accounts for their own school. Admin accounts are created by super admins. */
export default function NewUserScreen() {
  const { user, permissions } = useAuth();
  const create = useCreateUser();
  const roles = [
    ...(permissions?.manage_teachers ? [{ value: 'teacher' as const, label: 'Teacher' }] : []),
    ...(permissions?.manage_parents ? [{ value: 'parent' as const, label: 'Parent' }] : []),
  ];
  const [role, setRole] = useState<SchoolRole>(roles[0]?.value ?? 'teacher');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const usernameValid = USERNAME.test(username.trim().toLowerCase());

  const submit = async () => {
    setError(undefined);
    try {
      const { user: created } = await create.mutateAsync({
        role,
        displayName: displayName.trim(),
        email: email.trim(),
        username: username.trim().toLowerCase(),
        password,
      });
      router.replace({ pathname: '/admin/user/[id]', params: { id: String(created.id) } });
    } catch (e) {
      setError(e instanceof ApiError && e.details ? e.details.map((d) => d.message).join('\n') : (e as Error).message);
    }
  };

  if (roles.length === 0) {
    return (
      <Screen>
        <ThemedText>A super admin hasn&apos;t given you permission to create accounts.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="smallBold">Role</ThemedText>
      <Chips<SchoolRole> options={roles} value={role} onChange={setRole} />
      {role === 'teacher' && (
        <ThemedText type="small" themeColor="textSecondary">
          The teacher will belong to {user?.school?.name}. Assign their classes after creating the account.
        </ThemedText>
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
        Share the temporary password with the person privately.
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
        disabled={!displayName.trim() || !email.trim() || !usernameValid || password.length < 8}
      />
    </Screen>
  );
}
