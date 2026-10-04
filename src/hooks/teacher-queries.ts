import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { teacherApi } from '@/services/brightpath';
import type { ActivityInput, LessonInput } from '@/types/api';

const keys = {
  all: ['teacher'] as const,
  classes: ['teacher', 'classes'] as const,
  lessons: ['teacher', 'lessons'] as const,
  lesson: (id: number) => ['teacher', 'lesson', id] as const,
  activities: ['teacher', 'activities'] as const,
  activity: (id: number) => ['teacher', 'activity', id] as const,
};

export const useTeacherClasses = () =>
  useQuery({ queryKey: keys.classes, queryFn: () => teacherApi.classes().then((r) => r.classes) });

export const useTeacherLessons = () =>
  useQuery({ queryKey: keys.lessons, queryFn: () => teacherApi.lessons().then((r) => r.lessons) });

export const useTeacherLesson = (id: number | null) =>
  useQuery({ queryKey: keys.lesson(id ?? 0), queryFn: () => teacherApi.lesson(id!).then((r) => r.lesson), enabled: !!id });

export const useTeacherActivities = () =>
  useQuery({ queryKey: keys.activities, queryFn: () => teacherApi.activities().then((r) => r.activities) });

export const useTeacherActivity = (id: number | null) =>
  useQuery({
    queryKey: keys.activity(id ?? 0),
    queryFn: () => teacherApi.activity(id!).then((r) => r.activity),
    enabled: !!id,
  });

export function useSaveLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: LessonInput }) =>
      id ? teacherApi.updateLesson(id, input) : teacherApi.createLesson(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

/** Archive (hide from parents) or restore. Nothing is ever deleted. */
export function useArchiveLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) => teacherApi.archiveLesson(id, archived),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useSaveActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: ActivityInput }) =>
      id ? teacherApi.updateActivity(id, input) : teacherApi.createActivity(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

/** Archive (hide from parents) or restore. Nothing is ever deleted. */
export function useArchiveActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) => teacherApi.archiveActivity(id, archived),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
