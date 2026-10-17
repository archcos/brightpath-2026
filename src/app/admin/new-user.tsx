import { router } from 'expo-router';
import { useState } from 'react';

import { EMPTY_NAME, isNameComplete, NameFields, toPersonName } from '@/components/name-fields';
import { SexField } from '@/components/sex-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { useCreateUser } from '@/hooks/admin-queries';
import { errorMessage } from '@/services/api';
import type { Sex, User } from '@/types/api';
import { roleOptions } from '@/utils/roles';

type SchoolRole = 'teacher' | 'parent';

// Same rule as the server: no '@', so login can tell usernames from emails.
const USERNAME = /^[a-z0-9._]{3,30}$/;

/** School admins create teacher or parent accounts for their own school. Admin accounts are created by super admins. */
export default function NewUserScreen() {
  const { user, permissions } = useAuth();
  const create = useCreateUser();
  const roles = roleOptions<SchoolRole>([
    ...(permissions?.manage_teachers ? (['teacher'] as const) : []),
    ...(permissions?.manage_parents ? (['parent'] as const) : []),
  ]);
  const [role, setRole] = useState<SchoolRole>(roles[0]?.value ?? 'teacher');
  const [name, setName] = useState(EMPTY_NAME);
  const [sex, setSex] = useState<Sex | ''>('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [createdParent, setCreatedParent] = useState<User>();
  const usernameValid = USERNAME.test(username.trim().toLowerCase());

  const submit = async () => {
    setError(undefined);
    try {
      const { user: created } = await create.mutateAsync({
        role,
        ...toPersonName(name),
        sex: sex as Sex,
        email: email.trim(),
        username: username.trim().toLowerCase(),
        password,
      });
      if (created.role === 'teacher') {
        // Next step for a teacher is assigning classes.
        router.replace({ pathname: '/admin/user/[id]', params: { id: String(created.id) } });
      } else {
        // A parent only shows up in this school's list after connecting a child, so there's no page to open yet.
        setCreatedParent(created);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (createdParent) {
    return (
      <Screen>
        <Card tone="successSoft">
          <ThemedText type="heading">Parent account created</ThemedText>
          <ThemedText>
            {createdParent.displayName} can now sign in as @{createdParent.username} with the temporary password you set.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            They&apos;ll appear in your Users list once they connect their child with the student code and birth date.
          </ThemedText>
        </Card>
        <Button label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin'))} />
      </Screen>
    );
  }

  if (roles.length === 0) {
    return (
      <Screen>
        <ThemedText>A super admin hasn&apos;t given you permission to create accounts.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen>
      <Select<SchoolRole> label="Role" options={roles} value={role} onChange={setRole} />
      {role === 'teacher' && (
        <ThemedText type="small" themeColor="textSecondary">
          The teacher will belong to {user?.school?.name}. Assign their classes after creating the account.
        </ThemedText>
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
        disabled={!isNameComplete(name) || !sex || !email.trim() || !usernameValid || password.length < 8}
      />
    </Screen>
  );
}
