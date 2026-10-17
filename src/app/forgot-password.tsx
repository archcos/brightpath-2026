import { useLocalSearchParams } from 'expo-router';
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
import { authApi } from '@/services/brightpath';

/** Step 1 emails a 6-digit code; step 2 sets the new password with it and signs in. */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ login?: string }>();
  const [login, setLogin] = useState(params.login ?? '');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError(undefined);
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const canSend = !!login.trim() && !loading;
  const sendCode = () => {
    if (!canSend) return;
    void run(async () => {
      await authApi.forgotPassword(login.trim());
      setCodeSent(true);
    });
  };

  const canReset = /^\d{6}$/.test(code.trim()) && password.length >= 8 && !loading;
  // Signing in swaps this screen for the home screen (root layout guards).
  const reset = () => {
    if (!canReset) return;
    void run(async () => {
      await authApi.resetPassword(login.trim(), code.trim(), password);
      await signIn(login.trim(), password);
    });
  };

  return (
    <Screen>
      <Card style={styles.form}>
        {!codeSent ? (
          <>
            <ThemedText themeColor="textSecondary">
              Enter your email or username. We&apos;ll email you a 6-digit code to set a new password.
            </ThemedText>
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
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
              If an account matches, we sent a code to its email. It expires in 15 minutes. Check your spam folder if
              you don&apos;t see it.
            </ThemedText>
            <TextField
              label="6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="next"
            />
            <TextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={72}
              returnKeyType="go"
              onSubmitEditing={reset}
            />
            <ThemedText type="caption" themeColor="textSecondary">
              At least 8 characters. You&apos;ll be signed out on your other devices.
            </ThemedText>
          </>
        )}
        {error && (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          </View>
        )}
        {!codeSent ? (
          <Button label="Send code" onPress={sendCode} loading={loading} disabled={!canSend} />
        ) : (
          <>
            <Button label="Set new password" onPress={reset} loading={loading} disabled={!canReset} />
            <Button label="Send a new code" variant="ghost" onPress={sendCode} disabled={!canSend} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, padding: Spacing.four },
  error: { borderRadius: Radius.sm, padding: Spacing.two + 2 },
});
