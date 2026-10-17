import { StyleSheet, View } from 'react-native';

import { Select, type SelectOption } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import type { PersonName, Suffix } from '@/types/api';

/** Form state for a name: plain strings, '' = not given. */
export type NameInput = { firstName: string; middleName: string; lastName: string; suffix: Suffix | '' };

export const EMPTY_NAME: NameInput = { firstName: '', middleName: '', lastName: '', suffix: '' };

export const isNameComplete = (n: NameInput) => !!n.firstName.trim() && !!n.lastName.trim();

/** The request body shape the server expects (same rules as server/src/routes/schemas.js). */
export const toPersonName = (n: NameInput): PersonName => ({
  firstName: n.firstName.trim(),
  middleName: n.middleName.trim() || null,
  lastName: n.lastName.trim(),
  suffix: n.suffix || null,
});

const SUFFIXES: SelectOption<Suffix | ''>[] = [
  { value: '', label: 'None' },
  ...(['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'] as const).map((s) => ({ value: s, label: s })),
];

type Props = {
  value: NameInput;
  onChange: (value: NameInput) => void;
  /** The signed-in person's own name: lets the OS offer autofill. */
  own?: boolean;
};

/** First, middle (optional), last name and suffix (optional), as one form section. */
export function NameFields({ value, onChange, own }: Props) {
  const set = (key: keyof NameInput) => (text: string) => onChange({ ...value, [key]: text });

  return (
    <>
      <TextField
        label="First name"
        value={value.firstName}
        onChangeText={set('firstName')}
        maxLength={80}
        autoCapitalize="words"
        autoComplete={own ? 'given-name' : 'off'}
        textContentType={own ? 'givenName' : 'none'}
      />
      <TextField
        label="Middle name (optional)"
        value={value.middleName}
        onChangeText={set('middleName')}
        maxLength={80}
        autoCapitalize="words"
        autoComplete={own ? 'additional-name' : 'off'}
        textContentType={own ? 'middleName' : 'none'}
      />
      <View style={styles.row}>
        <View style={styles.last}>
          <TextField
            label="Last name"
            value={value.lastName}
            onChangeText={set('lastName')}
            maxLength={80}
            autoCapitalize="words"
            autoComplete={own ? 'family-name' : 'off'}
            textContentType={own ? 'familyName' : 'none'}
          />
        </View>
        <View style={styles.suffix}>
          <Select<Suffix | ''> label="Suffix" options={SUFFIXES} value={value.suffix} onChange={set('suffix')} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  // minWidth 0 so the fields shrink on narrow screens instead of overflowing.
  last: { flex: 2, minWidth: 0 },
  suffix: { flex: 1, minWidth: 0 },
});
