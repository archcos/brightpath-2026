import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { meApi } from '@/services/brightpath';

const CODE = /^BRP-\d{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function ConnectChildScreen() {
  const { refresh } = useAuth();
  const { selectChild } = useChild();
  const [code, setCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const normalizedCode = code.trim().toUpperCase();
  const valid = CODE.test(normalizedCode) && DATE.test(birthDate.trim());

  const submit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      const { child } = await meApi.connectChild(normalizedCode, birthDate.trim());
      await refresh();
      selectChild(child.id);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        Enter the student code from your child&apos;s school and their birth date. Both are needed so only your family
        can connect.
      </ThemedText>
      <TextField
        label="Student code"
        placeholder="BRP-123456"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
      />
      <TextField
        label="Child's birth date"
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      <Button label="Connect" onPress={submit} loading={loading} disabled={!valid} />
    </Screen>
  );
}
