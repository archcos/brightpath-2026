import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

/** Shown to accounts that aren't active yet (e.g. a teacher waiting for admin approval). */
export default function PendingScreen() {
  const { user, refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Screen tab>
      <View style={styles.hero}>
        <ThemedText style={styles.icon}>⏳</ThemedText>
        <ThemedText type="title">Waiting for approval</ThemedText>
      </View>
      <Card>
        <ThemedText>
          Hi {user?.displayName}!{' '}
          {user?.role === 'admin'
            ? `Your school admin account for ${user.school?.name ?? 'your school'} has been created. A BrightPath super admin needs to approve it.`
            : user?.status === 'disabled'
              ? 'This account has been disabled. Contact your school.'
              : `Your teacher account for ${user?.school?.name ?? 'your school'} has been created. Your school admin needs to approve it and assign your classes.`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Signed in as @{user?.username} ({user?.email})
        </ThemedText>
      </Card>
      <Button label="Check again" onPress={check} loading={checking} />
      <Button variant="ghost" label="Sign out" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  icon: { fontSize: 56, lineHeight: 68 },
});
