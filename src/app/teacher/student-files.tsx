import { useLocalSearchParams } from 'expo-router';

import { StudentFiles } from '@/components/student-files';
import { useTeacherClasses } from '@/hooks/teacher-queries';
import { sectionName } from '@/utils/format';

/** Import a class list from Excel and export parent codes, for the sections the teacher teaches. */
export default function TeacherStudentFilesScreen() {
  const classes = useTeacherClasses();
  const { sectionId } = useLocalSearchParams<{ sectionId?: string }>();
  const sections = new Map<string, { value: string; label: string }>();
  for (const c of classes.data ?? []) sections.set(String(c.sectionId), { value: String(c.sectionId), label: sectionName(c.grade, c.section) });
  return <StudentFiles kind="teacher" sections={[...sections.values()]} defaultSectionId={sectionId} />;
}
