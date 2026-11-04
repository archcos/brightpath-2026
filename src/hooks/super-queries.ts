import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { superApi, type AuditFilters } from '@/services/brightpath';
import type { Permission, Role, UserStatus } from '@/types/api';

const keys = {
  all: ['super'] as const,
  schools: ['super', 'schools'] as const,
  users: (f: object) => ['super', 'users', f] as const,
  user: (id: number) => ['super', 'user', id] as const,
};

/** Every school, for pickers. The Schools tab uses useSchoolsPage. */
export const useSchools = () => useQuery({ queryKey: keys.schools, queryFn: () => superApi.schools().then((r) => r.schools) });
export const useSchoolsPage = (page: number) =>
  useQuery({ queryKey: [...keys.schools, 'page', page], queryFn: () => superApi.schools(page), placeholderData: keepPreviousData });

export const useSuperUsers = (filters: { role?: Role; status?: UserStatus; schoolId?: number; q?: string; page: number }) =>
  useQuery({
    queryKey: keys.users(filters),
    queryFn: () => superApi.users(filters),
    // Keep showing the current list while a new filter/search loads.
    placeholderData: keepPreviousData,
  });

export const useAudit = (filters: AuditFilters) =>
  useQuery({
    queryKey: [...keys.all, 'audit', filters],
    queryFn: () => superApi.audit(filters),
    placeholderData: keepPreviousData,
    // Changes made elsewhere (e.g. while managing a school) don't refresh this list, so never trust the cache.
    staleTime: 0,
  });

export const useSuperUser = (id: number) => useQuery({ queryKey: keys.user(id), queryFn: () => superApi.user(id) });

const useSuperMutation = <TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }) });
};

export const useCreateSchool = () => useSuperMutation((name: string) => superApi.createSchool(name));
export const useUpdateSchool = () =>
  useSuperMutation(({ id, patch }: { id: number; patch: Parameters<typeof superApi.updateSchool>[1] }) =>
    superApi.updateSchool(id, patch),
  );
export const useSuperCreateUser = () => useSuperMutation(superApi.createUser);
export const useSuperUpdateUser = () =>
  useSuperMutation(({ id, patch }: { id: number; patch: Parameters<typeof superApi.updateUser>[1] }) =>
    superApi.updateUser(id, patch),
  );
export const useSetPermissions = () =>
  useSuperMutation(({ id, patch }: { id: number; patch: Partial<Record<Permission, boolean>> }) =>
    superApi.setPermissions(id, patch),
  );
