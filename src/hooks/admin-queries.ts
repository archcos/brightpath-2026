import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/services/brightpath';
import type { AdminStudent, UserStatus } from '@/types/api';

const keys = {
  all: ['admin'] as const,
  users: (f: object) => ['admin', 'users', f] as const,
  user: (id: number) => ['admin', 'user', id] as const,
  sections: ['admin', 'sections'] as const,
  subjects: ['admin', 'subjects'] as const,
  students: (f: object) => ['admin', 'students', f] as const,
};

export const useAdminUsers = (filters: { role?: 'parent' | 'teacher' | 'admin'; status?: UserStatus; q?: string }) =>
  useQuery({ queryKey: keys.users(filters), queryFn: () => adminApi.users(filters).then((r) => r.users) });

export const useAdminUser = (id: number) => useQuery({ queryKey: keys.user(id), queryFn: () => adminApi.user(id) });

export const useSections = () =>
  useQuery({ queryKey: keys.sections, queryFn: () => adminApi.sections().then((r) => r.sections) });

export const useSubjects = () =>
  useQuery({ queryKey: keys.subjects, queryFn: () => adminApi.subjects().then((r) => r.subjects), staleTime: Infinity });

export const useStudents = (filters: { sectionId?: number; status?: AdminStudent['status'] }) =>
  useQuery({ queryKey: keys.students(filters), queryFn: () => adminApi.students(filters).then((r) => r.students) });

const useAdminMutation = <TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }) });
};

export const useCreateUser = () => useAdminMutation(adminApi.createUser);
export const useUpdateUser = () =>
  useAdminMutation(({ id, patch }: { id: number; patch: { role?: 'parent' | 'teacher'; status?: UserStatus } }) =>
    adminApi.updateUser(id, patch),
  );
export const useSetAssignments = () =>
  useAdminMutation(({ id, assignments }: { id: number; assignments: { sectionId: number; subjectId: number }[] }) =>
    adminApi.setAssignments(id, assignments),
  );
export const useCreateSection = () => useAdminMutation(adminApi.createSection);
export const useUpdateSection = () =>
  useAdminMutation(({ id, patch }: { id: number; patch: Parameters<typeof adminApi.updateSection>[1] }) =>
    adminApi.updateSection(id, patch),
  );
export const useCreateStudent = () => useAdminMutation(adminApi.createStudent);
export const useUpdateStudent = () =>
  useAdminMutation(({ id, patch }: { id: number; patch: Parameters<typeof adminApi.updateStudent>[1] }) =>
    adminApi.updateStudent(id, patch),
  );
