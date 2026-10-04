import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      await signIn(login.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tab>
        <View style={styles.hero}>
          <ThemedText style={styles.logo}>🌟</ThemedText>
          <ThemedText type="title">BrightPath</ThemedText>
          <ThemedText themeColor="textSecondary">Learn today. Be ready for tomorrow.</ThemedText>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email or username"
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            keyboardType="email-address"
            textContentType="username"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
          />
          {error && (
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          )}
          <Button label="Sign in" onPress={submit} loading={loading} disabled={!login.trim() || !password} />
          <Link href="/sign-up" style={styles.link}>
            <ThemedText type="link">New to BrightPath? Create an account</ThemedText>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.six },
  logo: { fontSize: 56, lineHeight: 68 },
  form: { gap: Spacing.three },
  link: { alignSelf: 'center', marginTop: Spacing.two },
});
