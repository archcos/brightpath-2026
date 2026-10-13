import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { errorMessage } from '@/services/api';
import type { User } from '@/types/api';
import { confirmDestructive } from '@/utils/confirm';

function explain(user: User | null): { icon: string; title: string; body: string } {
  const school = user?.school?.name ?? 'your school';
  if (user?.school && user.school.active === false) {
    return {
      icon: '🏫',
      title: 'School not active',
      body: `${school} isn't active on BrightPath right now, so its teachers and admins can't sign in. Contact BrightPath support or your school.`,
    };
  }
  if (user?.status === 'disabled') {
    return { icon: '🔒', title: 'Account disabled', body: 'This account has been disabled. Contact your school.' };
  }
  if (user?.role === 'admin') {
    return {
      icon: '⏳',
      title: 'Waiting for approval',
      body: `Your school admin account for ${school} has been created. A BrightPath super admin needs to approve it.`,
    };
  }
  return {
    icon: '⏳',
    title: 'Waiting for approval',
    body: `Your teacher account for ${school} has been created. Your school admin needs to approve it and assign your classes.`,
  };
}

/** Shown to accounts that can't use the app yet: pending approval, or a teacher/admin of a deactivated school. */
export default function PendingScreen() {
  const { user, refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const [checkedAt, setCheckedAt] = useState<Date>();
  const info = explain(user);

  const check = async () => {
    setChecking(true);
    setError(undefined);
    try {
      await refresh();
      setCheckedAt(new Date());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const confirmSignOut = async () => {
    if (await confirmDestructive('Sign out?', 'You can sign back in anytime to check your status.', 'Sign out')) {
      await signOut();
    }
  };

  return (
    <Screen tab>
      <View style={styles.hero}>
        <ThemedText style={styles.icon}>{info.icon}</ThemedText>
        <ThemedText type="title" style={styles.center}>
          {info.title}
        </ThemedText>
      </View>
      <Card>
        <ThemedText>
          Hi {user?.displayName}! {info.body}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Signed in as @{user?.username} ({user?.email})
        </ThemedText>
      </Card>
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
      {checkedAt && !error && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.center} accessibilityLiveRegion="polite">
          Still waiting — last checked {checkedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.
          We also check automatically when you reopen the app.
        </ThemedText>
      )}
      <Button label="Check again" onPress={check} loading={checking} />
      <Button variant="ghost" label="Sign out" onPress={confirmSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  icon: { fontSize: 56, lineHeight: 68 },
  center: { textAlign: 'center' },
});
