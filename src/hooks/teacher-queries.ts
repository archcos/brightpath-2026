import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { teacherApi } from '@/services/brightpath';
import type { ActivityInput, LessonInput } from '@/types/api';

const keys = {
  all: ['teacher'] as const,
  classes: ['teacher', 'classes'] as const,
  pendant: ['teacher', 'pendant'] as const,
  lessons: ['teacher', 'lessons'] as const,
  lesson: (id: number) => ['teacher', 'lesson', id] as const,
  activities: ['teacher', 'activities'] as const,
  activity: (id: number) => ['teacher', 'activity', id] as const,
  notifications: ['teacher', 'notifications'] as const,
  recordings: ['teacher', 'recordings'] as const,
  sectionOptions: ['teacher', 'section-options'] as const,
};

/** Reminders such as "review your AI summary before midnight". Polled so the 10 PM reminder shows up. */
export const useTeacherNotifications = () =>
  useQuery({
    queryKey: keys.notifications,
    queryFn: () => teacherApi.notifications().then((r) => r.notifications),
    refetchInterval: 5 * 60_000,
  });

export function useReadTeacherNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.readNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

/** Recordings with no matching lesson (or that failed), waiting for the teacher to attach them. */
export const useTeacherRecordings = () =>
  useQuery({ queryKey: keys.recordings, queryFn: () => teacherApi.recordings().then((r) => r.recordings) });

export function useAttachRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lessonId }: { id: number; lessonId: number }) => teacherApi.attachRecording(id, lessonId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// One request feeds both hooks; each picks its half.
export const useTeacherClasses = () =>
  useQuery({ queryKey: keys.classes, queryFn: teacherApi.classes, select: (r) => r.classes });

export const useSectionOptions = () => useQuery({ queryKey: keys.sectionOptions, queryFn: teacherApi.sectionOptions });

export function useAddSection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: teacherApi.addSection, onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }) });
}

/** Classes the teacher no longer teaches (e.g. last school year): their lessons stay browsable, read-only. */
export const useTeacherPastClasses = () =>
  useQuery({ queryKey: keys.classes, queryFn: teacherApi.classes, select: (r) => r.pastClasses });

/** The pendant this teacher wears. Refreshes every minute while the dashboard is open, since its sync status changes. */
export const useTeacherPendant = () =>
  useQuery({
    queryKey: keys.pendant,
    queryFn: () => teacherApi.pendant().then((r) => r.pendant),
    refetchInterval: 60_000,
  });

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
