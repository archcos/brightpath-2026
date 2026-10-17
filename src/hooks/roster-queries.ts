import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, teacherApi, type StudentFilters } from '@/services/brightpath';

/** Who is managing the roster: a teacher (their sections) or a school admin (their school). */
export type RosterKind = 'teacher' | 'admin';

const apiFor = (kind: RosterKind) => (kind === 'teacher' ? teacherApi : adminApi);

// Under each role's own key prefix, so the role's existing "invalidate everything" mutations refresh these too.
const keys = {
  students: (kind: RosterKind, f: StudentFilters) => [kind, 'students', f] as const,
  student: (kind: RosterKind, id: number) => [kind, 'student', id] as const,
};

export const useRoster = (kind: RosterKind, filters: StudentFilters) =>
  useQuery({
    queryKey: keys.students(kind, filters),
    queryFn: () => apiFor(kind).students(filters).then((r) => r.students),
    placeholderData: keepPreviousData,
  });

export const useRosterStudent = (kind: RosterKind, id: number) =>
  useQuery({ queryKey: keys.student(kind, id), queryFn: () => apiFor(kind).student(id) });

/** Any roster change refreshes the role's lists, counts and details. */
function useRosterMutation<TArgs, TResult>(kind: RosterKind, fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }) });
}

export const useCreateRosterStudent = (kind: RosterKind) => useRosterMutation(kind, apiFor(kind).createStudent);
export const useIssueCode = (kind: RosterKind) => useRosterMutation(kind, (id: number) => apiFor(kind).issueCode(id));
export const useRevokeCode = (kind: RosterKind) =>
  useRosterMutation(kind, ({ id, codeId }: { id: number; codeId: number }) => apiFor(kind).revokeCode(id, codeId));
export const useRemoveParent = (kind: RosterKind) =>
  useRosterMutation(kind, ({ id, parentId }: { id: number; parentId: number }) => apiFor(kind).removeParent(id, parentId));
export const useImportStudents = (kind: RosterKind) => useRosterMutation(kind, apiFor(kind).importStudents);
/** Export may issue codes for students who had none, so it refreshes the lists too. */
export const useExportCodes = (kind: RosterKind) =>
  useRosterMutation(kind, ({ sectionId, format }: { sectionId: number; format: 'xlsx' | 'pdf' }) =>
    apiFor(kind).exportCodes(sectionId, format),
  );
