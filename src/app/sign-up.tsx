import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { EMPTY_NAME, isNameComplete, NameFields, toPersonName } from '@/components/name-fields';
import { SexField } from '@/components/sex-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { errorMessage } from '@/services/api';
import { publicApi, type AccountType } from '@/services/brightpath';
import type { Sex } from '@/types/api';

// Same rule as the server: no '@', so login can tell usernames from emails.
const USERNAME = /^[a-z0-9._]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HINT: Record<AccountType, string> = {
  parent: 'After signing up, connect your child using the student code from their school.',
  teacher: "Teacher accounts need approval. Your school's admin will review your account and assign your classes.",
  admin: 'School admin accounts need approval from a BrightPath super admin before you can manage your school.',
};

const ACCOUNT_TYPES: SelectOption<AccountType>[] = [
  { value: 'parent', label: 'Parent / Guardian', description: "Follow your child's lessons and schoolwork" },
  { value: 'teacher', label: 'Teacher', description: 'Post lesson summaries and activities (needs approval)' },
  { value: 'admin', label: 'School admin', description: "Manage your school's accounts (needs approval)" },
];

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const schools = useQuery({ queryKey: ['public', 'schools'], queryFn: () => publicApi.schools().then((r) => r.schools) });
  const [accountType, setAccountType] = useState<AccountType>('parent');
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState(EMPTY_NAME);
  const [sex, setSex] = useState<Sex | ''>('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const needsSchool = accountType !== 'parent';
  const passwordError = password && password.length < 8 ? 'At least 8 characters' : undefined;
  const usernameError =
    username && !USERNAME.test(username.trim().toLowerCase()) ? '3–30 letters, numbers, dots or underscores' : undefined;
  const emailError = email.trim() && !EMAIL.test(email.trim()) ? 'Enter a valid email address' : undefined;
  const canSubmit =
    isNameComplete(name) &&
    !!sex &&
    EMAIL.test(email.trim()) &&
    USERNAME.test(username.trim().toLowerCase()) &&
    password.length >= 8 &&
    (!needsSchool || !!schoolId) &&
    !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setError(undefined);
    setLoading(true);
    try {
      await signUp({
        ...toPersonName(name),
        sex: sex as Sex,
        email: email.trim(),
        username: username.trim().toLowerCase(),
        password,
        accountType,
        schoolId: needsSchool ? Number(schoolId) : undefined,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <Select<AccountType>
          label="I am a…"
          options={ACCOUNT_TYPES}
          value={accountType}
          onChange={setAccountType}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {HINT[accountType]}
        </ThemedText>
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
        <NameFields value={name} onChange={setName} own />
        <SexField value={sex} onChange={setSex} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          maxLength={255}
          error={emailError}
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
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={72}
          error={passwordError}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error && (
          <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
        <Button label="Create account" onPress={submit} loading={loading} disabled={!canSubmit} />
      </Card>
      <Button
        variant="ghost"
        label="Already have an account? Sign in"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: Spacing.three, padding: Spacing.four } });
