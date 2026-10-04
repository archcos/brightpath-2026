import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';
import { useTheme } from '@/hooks/use-theme';

export type SelectOption = { value: string; label: string; description?: string };

type SelectProps = {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
};

/**
 * Dropdown with search, for lists that can grow long (schools, sections).
 * Shows the full list when opened; typing filters it by label and description.
 */
export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Choose…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
}: SelectProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a searchable list"
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.flex} themeColor={selected ? 'text' : 'textSecondary'} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </ThemedText>
        <ThemedText themeColor="textSecondary">▾</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType={settings.reduceMotion ? 'none' : 'fade'} onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
          {/* Claims touches so tapping inside the sheet doesn't close it. */}
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.sheet, { backgroundColor: theme.background, marginTop: insets.top + Spacing.five }]}>
            <View style={styles.sheetHeader}>
              <ThemedText type="heading" style={styles.flex}>
                {label}
              </ThemedText>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
                <ThemedText type="link">Done</ThemedText>
              </Pressable>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`🔍  ${searchPlaceholder}`}
              placeholderTextColor={theme.textSecondary}
              autoFocus
              autoCorrect={false}
              accessibilityLabel={searchPlaceholder}
              style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            />
            <ThemedText type="caption" themeColor="textSecondary">
              {filtered.length} of {options.length}
            </ThemedText>
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                <ThemedText themeColor="textSecondary" style={styles.empty}>
                  {emptyText}
                </ThemedText>
              }
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.option,
                      { borderColor: theme.border },
                      active && { backgroundColor: theme.primarySoft },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" style={active ? { color: theme.primary } : undefined}>
                        {item.label}
                      </ThemedText>
                      {item.description && (
                        <ThemedText type="caption" themeColor="textSecondary">
                          {item.description}
                        </ThemedText>
                      )}
                    </View>
                    {active && <ThemedText themeColor="primary">✓</ThemedText>}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  flex: { flex: 1 },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  backdrop: { flex: 1, backgroundColor: '#0008', padding: Spacing.three },
  sheet: {
    flexShrink: 1,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  search: { minHeight: 44, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, fontSize: 16 },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
  },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
