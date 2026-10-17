import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { DateField } from '@/components/ui/date-field';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/context/auth-context';
import { useChild } from '@/context/child-context';
import { errorMessage } from '@/services/api';
import { meApi } from '@/services/brightpath';
import { CONNECTION_CODE, isValidISODate, maskConnectionCode, toISODate } from '@/utils/format';

export default function ConnectChildScreen() {
  const { refresh } = useAuth();
  const { selectChild } = useChild();
  const [code, setCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const dateValid = isValidISODate(birthDate) && birthDate <= toISODate(new Date());
  const valid = CONNECTION_CODE.test(code) && dateValid;

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
          Your child&apos;s teacher or school gives you a one-time code (like ABCD-2345). Enter it with your child&apos;s
          birth date. Each code works for one parent, once — if another family member needs access, ask for their own code.
        </ThemedText>
      </Card>
      <TextField
        label="Connection code"
        placeholder="ABCD-2345"
        value={code}
        onChangeText={(t) => setCode(maskConnectionCode(t))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={9}
      />
      <DateField
        label="Child's birth date"
        mode="date"
        value={birthDate}
        onChange={setBirthDate}
        max={toISODate(new Date())}
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
