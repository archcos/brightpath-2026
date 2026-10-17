import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/services/api';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn, notice } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const canSubmit = !!login.trim() && !!password && !loading;

  const submit = async () => {
    // The password field's "Go" key bypasses the disabled button, so check here too.
    if (!canSubmit) return;
    setError(undefined);
    setLoading(true);
    try {
      await signIn(login.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen tab>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: theme.primarySoft }]}>
          <ThemedText style={styles.logoIcon}>🌟</ThemedText>
        </View>
        <ThemedText type="title">BrightPath</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Learn today. Be ready for tomorrow.
        </ThemedText>
      </View>

      {notice && !error && (
        <Card tone="warningSoft">
          <ThemedText type="small" accessibilityLiveRegion="polite">
            {notice}
          </ThemedText>
        </Card>
      )}

      <Card style={styles.form}>
        <ThemedText type="heading">Welcome back</ThemedText>
        <TextField
          label="Email or username"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          keyboardType="email-address"
          textContentType="username"
          maxLength={255}
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          maxLength={72}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error && (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          </View>
        )}
        <Button label="Sign in" onPress={submit} loading={loading} disabled={!canSubmit} />
        <Link href={{ pathname: '/forgot-password', params: { login: login.trim() } }} style={styles.link}>
          <ThemedText type="link">Forgot password?</ThemedText>
        </Link>
      </Card>

      <Link href="/sign-up" style={styles.link}>
        <ThemedText themeColor="textSecondary">New to BrightPath? </ThemedText>
        <ThemedText type="link">Create an account</ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.five },
  logo: { width: 88, height: 88, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 48, lineHeight: 58 },
  center: { textAlign: 'center' },
  form: { gap: Spacing.three, padding: Spacing.four },
  error: { borderRadius: Radius.sm, padding: Spacing.two + 2 },
  link: { alignSelf: 'center' },
});
