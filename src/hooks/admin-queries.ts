import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, type StudentFilters } from '@/services/brightpath';
import type { UserStatus } from '@/types/api';

const keys = {
  all: ['admin'] as const,
  users: (f: object) => ['admin', 'users', f] as const,
  user: (id: number) => ['admin', 'user', id] as const,
  sections: ['admin', 'sections'] as const,
  settings: ['admin', 'settings'] as const,
  subjects: ['admin', 'subjects'] as const,
  pendants: ['admin', 'pendants'] as const,
  pendantKeys: (id: number) => ['admin', 'pendant-keys', id] as const,
  students: (f: object) => ['admin', 'students', f] as const,
};

export const useAdminUsers = (filters: { role?: 'parent' | 'teacher' | 'admin'; status?: UserStatus; q?: string; page: number }) =>
  useQuery({
    queryKey: keys.users(filters),
    queryFn: () => adminApi.users(filters),
    // Keep showing the current list while a new filter/search loads.
    placeholderData: keepPreviousData,
  });

export const useAdminUser = (id: number) => useQuery({ queryKey: keys.user(id), queryFn: () => adminApi.user(id) });

export const useSchoolSettings = () => useQuery({ queryKey: keys.settings, queryFn: adminApi.settings });

/** Every section, for pickers. The Sections tab uses useSectionsPage. */
export const useSections = () =>
  useQuery({ queryKey: keys.sections, queryFn: () => adminApi.sections().then((r) => r.sections) });
export const useSectionsPage = (page: number) =>
  useQuery({ queryKey: [...keys.sections, 'page', page], queryFn: () => adminApi.sections(page), placeholderData: keepPreviousData });

export const useSubjects = () =>
  useQuery({ queryKey: keys.subjects, queryFn: () => adminApi.subjects().then((r) => r.subjects), staleTime: Infinity });

export const useStudents = (filters: StudentFilters) =>
  useQuery({
    queryKey: keys.students(filters),
    queryFn: () => adminApi.students(filters),
    placeholderData: keepPreviousData,
  });

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
/** Every pendant, for the "give a pendant" picker. The Pendants tab uses usePendantsPage. */
export const usePendants = () =>
  useQuery({ queryKey: keys.pendants, queryFn: () => adminApi.pendants().then((r) => r.pendants) });
export const usePendantsPage = (page: number) =>
  useQuery({ queryKey: [...keys.pendants, 'page', page], queryFn: () => adminApi.pendants(page), placeholderData: keepPreviousData });
export const useRegisterPendant = () => useAdminMutation(adminApi.registerPendant);
export const useAssignPendant = () =>
  useAdminMutation(({ userId, pendantId }: { userId: number; pendantId: number | null }) =>
    adminApi.assignPendant(userId, pendantId),
  );
export const useTakeBackPendant = () => useAdminMutation(adminApi.takeBackPendant);
export const useNewPendantKey = () => useAdminMutation(adminApi.newPendantKey);
/** A pendant's upload keys and which device each is locked to. */
export const usePendantKeys = (id: number) =>
  useQuery({ queryKey: keys.pendantKeys(id), queryFn: () => adminApi.pendantKeys(id).then((r) => r.keys) });
export const useRevokePendantKey = () =>
  useAdminMutation(({ id, keyId }: { id: number; keyId: number }) => adminApi.revokePendantKey(id, keyId));

export const useCreateSection = () => useAdminMutation(adminApi.createSection);
export const useUpdateSchoolSettings = () => useAdminMutation(adminApi.updateSettings);
export const useUpdateSection = () =>
  useAdminMutation(({ id, patch }: { id: number; patch: Parameters<typeof adminApi.updateSection>[1] }) =>
    adminApi.updateSection(id, patch),
  );
export const useCreateStudent = () => useAdminMutation(adminApi.createStudent);
export const useUpdateStudent = () =>
  useAdminMutation(({ id, patch }: { id: number; patch: Parameters<typeof adminApi.updateStudent>[1] }) =>
    adminApi.updateStudent(id, patch),
  );
