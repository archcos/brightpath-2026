import { useLocalSearchParams } from 'expo-router';

import { StudentRosterDetail } from '@/components/student-roster-detail';

export default function TeacherStudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StudentRosterDetail kind="teacher" id={Number(id)} />;
}
