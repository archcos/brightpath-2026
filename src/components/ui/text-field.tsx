import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TextField({ label, error, secureTextEntry, ...props }: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.box,
          { backgroundColor: theme.backgroundElement, borderColor: error ? theme.danger : theme.border },
        ]}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={label}
          secureTextEntry={secureTextEntry && hidden}
          style={[styles.input, props.multiline && styles.multiline, { color: theme.text }]}
          {...props}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            style={styles.eye}>
            <ThemedText style={styles.eyeIcon}>{hidden ? '👁️' : '🙈'}</ThemedText>
          </Pressable>
        )}
      </View>
      {error && (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md },
  input: { flex: 1, minHeight: 48, paddingHorizontal: Spacing.three, fontSize: 16 },
  multiline: { minHeight: 110, paddingTop: Spacing.three, paddingBottom: Spacing.three, textAlignVertical: 'top' },
  eye: { paddingHorizontal: Spacing.three, minHeight: 48, justifyContent: 'center' },
  eyeIcon: { fontSize: 18, lineHeight: 22 },
});
