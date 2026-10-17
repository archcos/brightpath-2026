import { useLocalSearchParams } from 'expo-router';

import { StudentFiles } from '@/components/student-files';
import { useSections } from '@/hooks/admin-queries';
import { sectionName } from '@/utils/format';

/** Import a class list from Excel and export parent codes, for any active section of the school. */
export default function AdminStudentFilesScreen() {
  const sections = useSections();
  const { sectionId } = useLocalSearchParams<{ sectionId?: string }>();
  const options = (sections.data ?? [])
    .filter((s) => s.status === 'active')
    .map((s) => ({ value: String(s.id), label: sectionName(s.grade, s.name), description: s.schoolYear }));
  return <StudentFiles kind="admin" sections={options} defaultSectionId={sectionId} />;
}
