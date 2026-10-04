import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/services/api';
import { publicApi, type AccountType } from '@/services/brightpath';

// Same rule as the server: no '@', so login can tell usernames from emails.
const USERNAME = /^[a-z0-9._]{3,30}$/;

const HINT: Record<AccountType, string> = {
  parent: 'After signing up, connect your child using the student code from their school.',
  teacher: "Teacher accounts need approval. Your school's admin will review your account and assign your classes.",
  admin: 'School admin accounts need approval from a BrightPath super admin before you can manage your school.',
};

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const schools = useQuery({ queryKey: ['public', 'schools'], queryFn: () => publicApi.schools().then((r) => r.schools) });
  const [accountType, setAccountType] = useState<AccountType>('parent');
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const needsSchool = accountType !== 'parent';
  const passwordError = password && password.length < 8 ? 'At least 8 characters' : undefined;
  const usernameError =
    username && !USERNAME.test(username.trim().toLowerCase()) ? '3–30 letters, numbers, dots or underscores' : undefined;

  const submit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      await signUp({
        displayName: name.trim(),
        email: email.trim(),
        username: username.trim().toLowerCase(),
        password,
        accountType,
        schoolId: needsSchool ? Number(schoolId) : undefined,
      });
    } catch (e) {
      setError(e instanceof ApiError && e.details ? e.details.map((d) => d.message).join('\n') : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ThemedText type="smallBold">I am a…</ThemedText>
        <Chips<AccountType>
          options={[
            { value: 'parent', label: 'Parent / Guardian' },
            { value: 'teacher', label: 'Teacher' },
            { value: 'admin', label: 'School admin' },
          ]}
          value={accountType}
          onChange={setAccountType}
        />
        <ThemedText themeColor="textSecondary">{HINT[accountType]}</ThemedText>
        {needsSchool && (
          <Select
            label="School"
            placeholder="Choose your school"
            searchPlaceholder="Search schools"
            options={(schools.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
            value={schoolId}
            onChange={setSchoolId}
          />
        )}
        <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Username"
          placeholder="e.g. juan.delacruz"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          maxLength={30}
          error={usernameError}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={passwordError}
        />
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button
          label="Create account"
          onPress={submit}
          loading={loading}
          disabled={!name || !email || !USERNAME.test(username.trim().toLowerCase()) || password.length < 8 || (needsSchool && !schoolId)}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
