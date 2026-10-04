import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { useCreateStudent, useSections } from '@/hooks/admin-queries';
import { ApiError } from '@/services/api';
import type { AdminStudent } from '@/types/api';

export default function NewStudentScreen() {
  const sections = useSections();
  const create = useCreateStudent();
  const [sectionId, setSectionId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<AdminStudent>();

  // Students can only be added to active (non-archived) sections.
  const activeSections = (sections.data ?? []).filter((s) => s.status === 'active');
  const section = sectionId || String(activeSections[0]?.id ?? '');

  const submit = async () => {
    setError(undefined);
    try {
      const { student } = await create.mutateAsync({
        sectionId: Number(section),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate.trim(),
      });
      setCreated(student);
      setFirstName('');
      setLastName('');
      setBirthDate('');
    } catch (e) {
      setError(e instanceof ApiError && e.details ? e.details.map((d) => d.message).join('\n') : (e as Error).message);
    }
  };

  return (
    <Screen>
      {created && (
        <Card tone="successSoft">
          <ThemedText type="smallBold">
            {created.firstName} {created.lastName} added
          </ThemedText>
          <ThemedText type="small">Student code (share with the parents):</ThemedText>
          <ThemedText type="heading" selectable>
            {created.studentCode}
          </ThemedText>
        </Card>
      )}
      <Select
        label="Section"
        placeholder="Choose a section"
        searchPlaceholder="Search grade, section or year"
        options={activeSections.map((s) => ({
          value: String(s.id),
          label: `Grade ${s.grade} • ${s.name}`,
          description: `School year ${s.schoolYear}`,
        }))}
        value={section}
        onChange={setSectionId}
      />
      <TextField label="First name" value={firstName} onChangeText={setFirstName} maxLength={80} />
      <TextField label="Last name" value={lastName} onChangeText={setLastName} maxLength={80} />
      <TextField label="Birth date" placeholder="YYYY-MM-DD" value={birthDate} onChangeText={setBirthDate} maxLength={10} />
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
      <Button
        label="Add student"
        onPress={submit}
        loading={create.isPending}
        disabled={!section || !firstName.trim() || !lastName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())}
      />
    </Screen>
  );
}
