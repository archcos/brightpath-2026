import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Select, type SelectOption } from '@/components/ui/select';
import { Spacing } from '@/constants/theme';
import { useExportCodes, useImportStudents, type RosterKind } from '@/hooks/roster-queries';
import { ApiError, errorMessage } from '@/services/api';
import { adminApi, teacherApi } from '@/services/brightpath';
import { pickSpreadsheet, saveFile } from '@/services/files';
import type { AdminStudent, StudentCode } from '@/types/api';
import { confirmAction } from '@/utils/confirm';

type Problem = { field: string; message: string };

/**
 * Import a class list from Excel (template first), and export each student's one-time parent code as an
 * Excel list or PDF slips. Birth dates are never exported: a code only works together with the birth date.
 */
export function StudentFiles({
  kind,
  sections,
  defaultSectionId,
}: {
  kind: RosterKind;
  sections: SelectOption[];
  defaultSectionId?: string;
}) {
  const importStudents = useImportStudents(kind);
  const exportCodes = useExportCodes(kind);
  const [sectionId, setSectionId] = useState('');
  const [busy, setBusy] = useState<'template' | null>(null);
  const [created, setCreated] = useState<{ student: AdminStudent; code: StudentCode }[]>();
  const [problems, setProblems] = useState<Problem[]>();
  const [error, setError] = useState<string>();
  const preset = sections.some((s) => s.value === defaultSectionId) ? defaultSectionId : undefined;
  const section = sectionId || preset || sections[0]?.value || '';
  const sectionLabel = sections.find((s) => s.value === section)?.label ?? 'this section';

  const reset = () => {
    setError(undefined);
    setProblems(undefined);
    setCreated(undefined);
  };

  const downloadTemplate = async () => {
    reset();
    setBusy('template');
    try {
      await saveFile(await (kind === 'teacher' ? teacherApi : adminApi).importTemplate());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const upload = async () => {
    reset();
    try {
      const picked = await pickSpreadsheet();
      if (!picked) return;
      const ok = await confirmAction(
        'Import students?',
        `Every student in ${picked.name} will be added to ${sectionLabel}, each with a one-time parent code. If any row has a problem, nothing is added.`,
        'Import',
      );
      if (!ok) return;
      setCreated((await importStudents.mutateAsync({ sectionId: Number(section), file: picked.base64 })).created);
    } catch (e) {
      if (e instanceof ApiError && e.details?.length) {
        setError(e.message);
        setProblems(e.details);
      } else {
        setError(errorMessage(e));
      }
    }
  };

  const download = async (format: 'xlsx' | 'pdf') => {
    reset();
    const ok = await confirmAction(
      format === 'pdf' ? 'Download code slips?' : 'Download code list?',
      `One unused code per student in ${sectionLabel}; students without one get a new code. Birth dates are left out, so a code alone can't be used by someone else.`,
      'Download',
    );
    if (!ok) return;
    try {
      await saveFile(await exportCodes.mutateAsync({ sectionId: Number(section), format }));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <Select
        label="Section"
        placeholder="Choose a section"
        searchPlaceholder="Search grade or section"
        options={sections}
        value={section}
        onChange={(v) => {
          setSectionId(v);
          reset();
        }}
      />

      <Card>
        <ThemedText type="heading">Import students from Excel</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          1. Download the template. 2. Fill one student per row: first name, middle name, last name, suffix, sex and
          birth date (YYYY-MM-DD). The “How to fill” sheet has an example. 3. Choose the filled file.
        </ThemedText>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button variant="secondary" label="Download template" onPress={downloadTemplate} loading={busy === 'template'} />
          </View>
          <View style={styles.flex}>
            <Button label="Choose filled file" onPress={upload} loading={importStudents.isPending} disabled={!section} />
          </View>
        </View>
      </Card>

      {error && (
        <Card tone="dangerSoft">
          <ThemedText type="smallBold" themeColor="danger" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
          {problems?.map((p, i) => (
            <ThemedText key={i} type="small">
              {p.field}: {p.message}
            </ThemedText>
          ))}
        </Card>
      )}

      {created && (
        <Card tone="successSoft">
          <ThemedText type="smallBold">
            Added {created.length} student{created.length === 1 ? '' : 's'} to {sectionLabel}
          </ThemedText>
          {created.map(({ student, code }) => (
            <View key={student.id} style={styles.row}>
              <ThemedText type="small" style={styles.flex}>
                {student.fullName}
              </ThemedText>
              <ThemedText type="code" selectable>
                {code.code}
              </ThemedText>
            </View>
          ))}
          <ThemedText type="caption" themeColor="textSecondary">
            Download the codes below to print slips for the parents.
          </ThemedText>
        </Card>
      )}

      <Card>
        <ThemedText type="heading">Codes for parents</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          A one-time code for every student, without birth dates. Give each family their own code; it works once.
        </ThemedText>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label="Excel list"
              onPress={() => download('xlsx')}
              loading={exportCodes.isPending && exportCodes.variables?.format === 'xlsx'}
              disabled={!section}
            />
          </View>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label="PDF slips"
              onPress={() => download('pdf')}
              loading={exportCodes.isPending && exportCodes.variables?.format === 'pdf'}
              disabled={!section}
            />
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
