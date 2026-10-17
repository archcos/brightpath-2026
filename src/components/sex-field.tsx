import { Select, type SelectOption } from '@/components/ui/select';
import type { Sex } from '@/types/api';

const OPTIONS: SelectOption<Sex>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export const SEX_LABEL: Record<Sex, string> = { female: 'Female', male: 'Male' };

/** Sex as on school records; required wherever a person is created. '' until picked. */
export function SexField({ value, onChange }: { value: Sex | ''; onChange: (value: Sex) => void }) {
  return <Select<Sex | ''> label="Sex" placeholder="Choose" options={OPTIONS} value={value} onChange={(v) => v && onChange(v)} />;
}
