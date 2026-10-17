import { useLocalSearchParams } from 'expo-router';

import { StudentRosterDetail } from '@/components/student-roster-detail';

export default function AdminStudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StudentRosterDetail kind="admin" id={Number(id)} />;
}
