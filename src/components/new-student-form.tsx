import { router } from 'expo-router';
import { useState } from 'react';

import { EMPTY_NAME, isNameComplete, NameFields, toPersonName } from '@/components/name-fields';
import { SexField } from '@/components/sex-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { useCreateRosterStudent, type RosterKind } from '@/hooks/roster-queries';
import { errorMessage } from '@/services/api';
import type { AdminStudent, Sex, StudentCode } from '@/types/api';
import { confirmAction } from '@/utils/confirm';
import { formatMonthDay, isValidISODate, toISODate } from '@/utils/format';

/**
 * Adds a student to one of `sections` (a teacher's own sections, or any active section for a school admin)
 * and shows the student's first one-time code to give to a parent.
 */
export function NewStudentForm({
  kind,
  sections,
  defaultSectionId,
}: {
  kind: RosterKind;
  sections: SelectOption[];
  /** The section the user was looking at, if any; they can still pick another. */
  defaultSectionId?: string;
}) {
  const create = useCreateRosterStudent(kind);
  const [sectionId, setSectionId] = useState('');
  const [name, setName] = useState(EMPTY_NAME);
  const [sex, setSex] = useState<Sex | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ student: AdminStudent; code: StudentCode }>();
  const preset = sections.some((s) => s.value === defaultSectionId) ? defaultSectionId : undefined;
  const section = sectionId || preset || sections[0]?.value || '';

  const submit = async () => {
    setError(undefined);
    const sectionLabel = sections.find((s) => s.value === section)?.label ?? 'this section';
    const ok = await confirmAction('Add student?', `${toPersonName(name).firstName} will be added to ${sectionLabel}.`, 'Add student');
    if (!ok) return;
    try {
      setCreated(await create.mutateAsync({ sectionId: Number(section), ...toPersonName(name), sex: sex as Sex, birthDate }));
      setName(EMPTY_NAME);
      setSex('');
      setBirthDate('');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const openStudent = (id: number) => {
    const params = { id: String(id) };
    if (kind === 'teacher') router.replace({ pathname: '/teacher/student/[id]', params });
    else router.replace({ pathname: '/admin/student/[id]', params });
  };

  return (
    <Screen>
      {created && (
        <Card tone="successSoft">
          <ThemedText type="smallBold">{created.student.fullName} added</ThemedText>
          <ThemedText type="small">One-time code for a parent (works once, with the birth date):</ThemedText>
          <ThemedText type="title" selectable>
            {created.code.code}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Expires {formatMonthDay(created.code.expiresAt)}. Each parent needs their own code — make more on the student&apos;s page.
          </ThemedText>
          <Button variant="secondary" label="Open student" onPress={() => openStudent(created.student.id)} />
        </Card>
      )}
      <Select
        label="Section"
        placeholder="Choose a section"
        searchPlaceholder="Search grade, section or year"
        options={sections}
        value={section}
        onChange={setSectionId}
      />
      <NameFields value={name} onChange={setName} />
      <SexField value={sex} onChange={setSex} />
      {/* Same range the server accepts: in the past, within the last 30 years. */}
      <DateField
        label="Birth date"
        mode="date"
        value={birthDate}
        onChange={setBirthDate}
        min={`${new Date().getFullYear() - 30}-01-01`}
        max={toISODate(new Date())}
      />
      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}
      <Button
        label="Add student"
        onPress={submit}
        loading={create.isPending}
        disabled={!section || !isNameComplete(name) || !sex || !isValidISODate(birthDate)}
      />
    </Screen>
  );
}
