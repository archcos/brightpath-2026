import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { errorMessage } from '@/services/api';
import { meApi } from '@/services/brightpath';
import { isValidISODate, maskDate, maskStudentCode, toISODate } from '@/utils/format';

const CODE = /^BRP-\d{6}$/;

export default function ConnectChildScreen() {
  const { refresh } = useAuth();
  const { selectChild } = useChild();
  const [code, setCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const dateComplete = birthDate.length === 10;
  const dateValid = isValidISODate(birthDate) && birthDate <= toISODate(new Date());
  const valid = CODE.test(code) && dateValid;

  const submit = async () => {
    if (!valid || loading) return;
    setError(undefined);
    setLoading(true);
    try {
      const { child } = await meApi.connectChild(code, birthDate);
      selectChild(child.id);
      await refresh().catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card tone="primarySoft">
        <ThemedText type="smallBold">🔐 Where do I find these?</ThemedText>
        <ThemedText type="small">
          Your child&apos;s school gives you a student code (like BRP-123456). You&apos;ll also need your child&apos;s birth
          date — both are required so only your family can connect.
        </ThemedText>
      </Card>
      <TextField
        label="Student code"
        placeholder="BRP-123456"
        value={code}
        onChangeText={(t) => setCode(maskStudentCode(t))}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
      />
      <TextField
        label="Child's birth date"
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={(t) => setBirthDate(maskDate(t))}
        keyboardType="number-pad"
        maxLength={10}
        error={dateComplete && !dateValid ? 'Enter a real date in the past, e.g. 2018-11-02' : undefined}
        returnKeyType="go"
        onSubmitEditing={submit}
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
