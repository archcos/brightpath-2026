import { useLocalSearchParams } from 'expo-router';

import { NewStudentForm } from '@/components/new-student-form';
import { useSections } from '@/hooks/admin-queries';
import { sectionName } from '@/utils/format';

export default function NewStudentScreen() {
  const sections = useSections();
  const { sectionId } = useLocalSearchParams<{ sectionId?: string }>();
  // Students can only be added to active (non-archived) sections.
  const options = (sections.data ?? [])
    .filter((s) => s.status === 'active')
    .map((s) => ({ value: String(s.id), label: sectionName(s.grade, s.name), description: s.schoolYear }));
  return <NewStudentForm kind="admin" sections={options} defaultSectionId={sectionId} />;
}
