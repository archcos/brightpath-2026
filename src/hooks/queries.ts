import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useChildId } from '@/context/child-context';
import {
  childApi,
  meApi,
  type ActivityGroup,
  type ActivityStateFilter,
  type LessonRange,
  type SavedType,
} from '@/services/brightpath';
import type { ActivityStatus, NotificationType } from '@/types/api';

// Every child-scoped key starts with ['child', id] so switching or invalidating a child is one call.
const keys = {
  child: (id: number) => ['child', id] as const,
  profile: (id: number) => ['child', id, 'profile'] as const,
  overview: (id: number) => ['child', id, 'overview'] as const,
  weekly: (id: number) => ['child', id, 'weekly'] as const,
  calendar: (id: number, month: string) => ['child', id, 'calendar', month] as const,
  pendant: (id: number) => ['child', id, 'pendant'] as const,
  lessons: (id: number, f: object) => ['child', id, 'lessons', f] as const,
  lesson: (id: number, slug: string) => ['child', id, 'lesson', slug] as const,
  activities: (id: number, f: object) => ['child', id, 'activities', f] as const,
  activity: (id: number, slug: string) => ['child', id, 'activity', slug] as const,
  saved: (id: number) => ['child', id, 'saved'] as const,
  notifications: (id: number) => ['child', id, 'notifications'] as const,
  preferences: ['preferences'] as const,
};

export function useChildProfile() {
  const id = useChildId();
  return useQuery({ queryKey: keys.profile(id), queryFn: () => childApi.profile(id).then((r) => r.child), enabled: !!id });
}

export function useOverview() {
  const id = useChildId();
  return useQuery({ queryKey: keys.overview(id), queryFn: () => childApi.overview(id), enabled: !!id });
}

export function useWeekly() {
  const id = useChildId();
  return useQuery({ queryKey: keys.weekly(id), queryFn: () => childApi.weekly(id), enabled: !!id });
}

export function useCalendar(month: string) {
  const id = useChildId();
  return useQuery({
    queryKey: keys.calendar(id, month),
    queryFn: () => childApi.calendar(id, month).then((r) => r.entries),
    enabled: !!id,
  });
}

export function usePendant() {
  const id = useChildId();
  return useQuery({ queryKey: keys.pendant(id), queryFn: () => childApi.pendant(id).then((r) => r.pendant), enabled: !!id });
}

export function useLessons(filters: { subject?: string; range?: LessonRange }) {
  const id = useChildId();
  return useQuery({
    queryKey: keys.lessons(id, filters),
    queryFn: () => childApi.lessons(id, filters).then((r) => r.lessons),
    enabled: !!id,
  });
}

export function useLesson(slug: string) {
  const id = useChildId();
  return useQuery({ queryKey: keys.lesson(id, slug), queryFn: () => childApi.lesson(id, slug).then((r) => r.lesson), enabled: !!id });
}

export function useMarkLessonViewed() {
  const id = useChildId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => childApi.viewLesson(id, slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.weekly(id) }),
  });
}

export function useActivities(filters: { group?: ActivityGroup; state?: ActivityStateFilter }) {
  const id = useChildId();
  return useQuery({ queryKey: keys.activities(id, filters), queryFn: () => childApi.activities(id, filters), enabled: !!id });
}

export function useActivity(slug: string) {
  const id = useChildId();
  return useQuery({
    queryKey: keys.activity(id, slug),
    queryFn: () => childApi.activity(id, slug).then((r) => r.activity),
    enabled: !!id,
  });
}

export function useSetActivityStatus() {
  const id = useChildId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, status }: { slug: string; status: ActivityStatus }) => childApi.setActivityStatus(id, slug, status),
    // Status feeds counts on almost every screen, so refresh everything for this child.
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.child(id) }),
  });
}

export function useSaved() {
  const id = useChildId();
  return useQuery({ queryKey: keys.saved(id), queryFn: () => childApi.saved(id), enabled: !!id });
}

export function useToggleSaved() {
  const id = useChildId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, itemId, saved }: { type: SavedType; itemId: number; saved: boolean }) =>
      saved ? childApi.unsave(id, type, itemId) : childApi.save(id, type, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.child(id) }),
  });
}

export function useNotifications() {
  const id = useChildId();
  return useQuery({
    queryKey: keys.notifications(id),
    queryFn: () => childApi.notifications(id).then((r) => r.notifications),
    enabled: !!id,
  });
}

export function useReadNotifications() {
  const id = useChildId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId?: number) =>
      notificationId ? childApi.readNotification(id, notificationId) : childApi.readAllNotifications(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.notifications(id) });
      qc.invalidateQueries({ queryKey: keys.overview(id) });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: keys.preferences, queryFn: () => meApi.preferences().then((r) => r.preferences) });
}

export function useSetNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Record<NotificationType, boolean>>) => meApi.setPreferences(patch),
    onSuccess: (r) => {
      qc.setQueryData(keys.preferences, r.preferences);
      qc.invalidateQueries({ queryKey: ['child'] });
    },
  });
}
