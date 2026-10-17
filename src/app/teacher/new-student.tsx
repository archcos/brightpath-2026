import { useLocalSearchParams } from 'expo-router';

import { NewStudentForm } from '@/components/new-student-form';
import { useTeacherClasses } from '@/hooks/teacher-queries';
import { sectionName } from '@/utils/format';

/** Teachers add students to the sections they teach (the server checks the same rule). */
export default function TeacherNewStudentScreen() {
  const classes = useTeacherClasses();
  const { sectionId } = useLocalSearchParams<{ sectionId?: string }>();
  const sections = new Map<string, { value: string; label: string; description: string }>();
  for (const c of classes.data ?? []) {
    const entry = sections.get(String(c.sectionId)) ?? { value: String(c.sectionId), label: sectionName(c.grade, c.section), description: '' };
    entry.description = [entry.description, c.subject.name].filter(Boolean).join(', ');
    sections.set(entry.value, entry);
  }
  return <NewStudentForm kind="teacher" sections={[...sections.values()]} defaultSectionId={sectionId} />;
}
