import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, errorMessage } from '@/services/api';
import { authApi } from '@/services/brightpath';

// The server sends at most one code a minute per account (and 5 an hour).
const RESEND_SECONDS = 60;

/** Step 1 emails a 6-digit code, step 2 checks it, step 3 sets the new password and signs in. */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ login?: string }>();
  const [login, setLogin] = useState(params.login ?? '');
  const [step, setStep] = useState<'login' | 'code' | 'password'>('login');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const run = async (action: () => Promise<void>) => {
    setError(undefined);
    setLoading(true);
    try {
      await action();
    } catch (e) {
      // An expired or used-up code can't set a password: go back and ask for a new one.
      if (e instanceof ApiError && e.code === 'reset_code_invalid') setStep('code');
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const canSend = !!login.trim() && !loading && resendIn <= 0;
  const sendCode = () => {
    if (!canSend) return;
    void run(async () => {
      await authApi.forgotPassword(login.trim());
      setCode('');
      setStep('code');
      setResendIn(RESEND_SECONDS);
    });
  };

  const canVerify = /^\d{6}$/.test(code.trim()) && !loading;
  const verify = () => {
    if (!canVerify) return;
    void run(async () => {
      await authApi.verifyResetCode(login.trim(), code.trim());
      setStep('password');
    });
  };

  const canReset = password.length >= 8 && !loading;
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
        {step === 'login' && (
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
        )}
        {step === 'code' && (
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
              returnKeyType="go"
              onSubmitEditing={verify}
            />
          </>
        )}
        {step === 'password' && (
          <>
            <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
              Code confirmed. Choose a new password.
            </ThemedText>
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
        {step === 'login' && <Button label="Send code" onPress={sendCode} loading={loading} disabled={!canSend} />}
        {step === 'code' && (
          <>
            <Button label="Verify code" onPress={verify} loading={loading} disabled={!canVerify} />
            <Button
              label={resendIn > 0 ? `Send a new code (${resendIn}s)` : 'Send a new code'}
              variant="ghost"
              onPress={sendCode}
              disabled={!canSend}
            />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
              You can get up to 5 codes an hour.
            </ThemedText>
          </>
        )}
        {step === 'password' && (
          <Button label="Set new password" onPress={reset} loading={loading} disabled={!canReset} />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, padding: Spacing.four },
  error: { borderRadius: Radius.sm, padding: Spacing.two + 2 },
  center: { textAlign: 'center' },
});
