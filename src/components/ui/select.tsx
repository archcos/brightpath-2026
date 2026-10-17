import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Popup } from '@/components/ui/popup';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `group`: options with the same group are listed together under that heading (keep them adjacent). */
export type SelectOption<T extends string = string> = { value: T; label: string; description?: string; group?: string };

type SelectProps<T extends string> = {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Show a search box. Defaults to on for long lists only, so short pickers never open the keyboard. */
  searchable?: boolean;
  /** Smaller label for filter rows (e.g. two dropdowns side by side). */
  compact?: boolean;
  /** Read-only: shows the value without opening the list. */
  disabled?: boolean;
};

const SEARCH_THRESHOLD = 8;

/** A dropdown: tap to open a list in a popup and pick one. Long lists (schools, sections) get a search box. */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Choose…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  searchable = options.length > SEARCH_THRESHOLD,
  compact,
  disabled,
}: SelectProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.group ?? ''} ${o.label} ${o.description ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <ThemedText type={compact ? 'label' : 'smallBold'} themeColor={compact ? 'textSecondary' : undefined}>
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of choices"
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.compactTrigger,
          { backgroundColor: disabled ? 'transparent' : theme.backgroundElement, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText
          type={compact ? 'smallBold' : 'default'}
          style={styles.flex}
          themeColor={selected ? 'text' : 'textSecondary'}
          numberOfLines={compact ? 1 : 2}>
          {selected?.label ?? placeholder}
        </ThemedText>
        {!disabled && <ThemedText themeColor="textSecondary">▾</ThemedText>}
      </Pressable>

      <Popup visible={open} onClose={close} style={searchable && styles.tall}>
        <View style={styles.header}>
          <ThemedText type="heading" style={styles.flex}>
            {label}
          </ThemedText>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <ThemedText type="link">Done</ThemedText>
          </Pressable>
        </View>
        {searchable && (
          <>
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
          </>
        )}
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
          renderItem={({ item, index }) => {
            const active = item.value === value;
            // Options sharing a `group` (e.g. "Grade 4") get one heading above the first of them.
            const heading = item.group && item.group !== filtered[index - 1]?.group ? item.group : null;
            return (
              <>
                {heading && (
                  <ThemedText type="label" themeColor="textSecondary" style={styles.group} accessibilityRole="header">
                    {heading}
                  </ThemedText>
                )}
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
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
              </>
            );
          }}
        />
      </Popup>
    </View>
  );
}

/** Two or more compact dropdowns side by side, e.g. "Type" and "Status" filters. */
export function FilterRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.filterRow}>{children}</View>;
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  compactField: { flex: 1, minWidth: 0 },
  flex: { flex: 1 },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  compactTrigger: { minHeight: 44 },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center' },
  // Long, searchable lists get a fixed height so the card doesn't jump while filtering.
  tall: { height: '80%' },
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
  group: { paddingTop: Spacing.three, paddingBottom: Spacing.one, paddingHorizontal: Spacing.two },
  filterRow: { flexDirection: 'row', gap: Spacing.two },
});
