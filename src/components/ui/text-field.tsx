import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LINE = 22;
const PAD = Spacing.three;
const linesHeight = (lines: number) => lines * LINE + PAD * 2;

type Props = TextInputProps & {
  label: string;
  error?: string;
  /**
   * One paragraph that wraps onto more lines as you type, so long text stays readable.
   * Enter finishes the field instead of adding a line break.
   */
  wrap?: boolean;
  /** Multiline/wrap: lines shown when empty (default 1 for wrap, 4 for multiline). */
  minLines?: number;
  /** Multiline/wrap: grows up to this many lines, then scrolls inside (default 4 for wrap, 8 for multiline). Infinity = no limit. */
  maxLines?: number;
};

export function TextField({ label, error, secureTextEntry, wrap, minLines, maxLines, ...props }: Props) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const multiline = wrap || props.multiline;
  const minHeight = linesHeight(minLines ?? (wrap ? 1 : 4));
  const readOnly = props.editable === false;
  // Read-only fields show all their text, so nobody has to scroll inside a box to read it.
  const maxHeight = maxLines === Infinity || readOnly ? undefined : linesHeight(maxLines ?? (wrap ? 4 : 8));
  // Native multiline inputs grow by themselves; on web the textarea needs its height set from its content.
  // shortcut: on web the box grows but doesn't shrink back when text is deleted; fine for forms.
  const webHeight =
    Platform.OS === 'web' && multiline
      ? Math.min(Math.max(contentHeight, minHeight), maxHeight ?? Infinity)
      : undefined;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.box,
          {
            backgroundColor: readOnly ? 'transparent' : theme.backgroundElement,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={label}
          secureTextEntry={secureTextEntry && hidden}
          style={[
            styles.input,
            multiline && [styles.multiline, { minHeight, maxHeight, height: webHeight }],
            { color: theme.text },
          ]}
          {...props}
          placeholder={readOnly ? '—' : props.placeholder}
          multiline={multiline}
          scrollEnabled={multiline ? true : props.scrollEnabled}
          submitBehavior={wrap ? 'blurAndSubmit' : props.submitBehavior}
          // react-native-web only blocks the line break on Enter when blurOnSubmit + onSubmitEditing are set.
          blurOnSubmit={wrap || props.blurOnSubmit}
          onSubmitEditing={props.onSubmitEditing ?? (wrap ? () => {} : undefined)}
          onContentSizeChange={(e) => {
            setContentHeight(e.nativeEvent.contentSize.height);
            props.onContentSizeChange?.(e);
          }}
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
  // minWidth 0: on web an <input> otherwise keeps its intrinsic ~200px width, so side-by-side fields
  // (e.g. Date / Start time / Minutes) overflow narrow screens and the whole form scrolls sideways.
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: Spacing.three, fontSize: 16 },
  multiline: { paddingTop: PAD, paddingBottom: PAD, lineHeight: LINE, textAlignVertical: 'top' },
  eye: { paddingHorizontal: Spacing.three, minHeight: 48, justifyContent: 'center' },
  eyeIcon: { fontSize: 18, lineHeight: 22 },
});
