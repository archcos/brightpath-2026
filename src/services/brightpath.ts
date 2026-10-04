import type {
  Activity,
  ActivityInput,
  AdminStudent,
  AdminUserDetail,
  ActivityCounts,
  ActivityDetail,
  ActivityStatus,
  AppNotification,
  CalendarEntry,
  Child,
  ChildProfile,
  Lesson,
  LessonDetail,
  NotificationType,
  Overview,
  Pendant,
  Permission,
  Permissions,
  Role,
  Saved,
  School,
  Section,
  SuperUserDetail,
  TeacherActivity,
  TeacherActivityDetail,
  TeacherLesson,
  TeacherLessonDetail,
  TeacherProfile,
  User,
  UserStatus,
  Weekly,
  ClassAssignment,
  LessonInput,
} from '@/types/api';

import { api } from './api';

type AuthResponse = { token: string; user: User };
export type AccountType = 'parent' | 'teacher' | 'admin';
export type LessonRange = 'today' | 'week' | 'month' | 'all';
export type ActivityGroup = 'assignments' | 'homework' | 'quizzes' | 'exams' | 'projects' | 'events';
export type ActivityStateFilter = 'upcoming' | 'completed' | 'overdue';
export type SavedType = 'lesson' | 'word' | 'activity';

const qs = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter((e): e is [string, string] => !!e[1]);
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};
const child = (id: number) => `/children/${id}`;

export const authApi = {
  /** `login` is an email or a username. */
  login: (login: string, password: string) => api<AuthResponse>('/auth/login', { method: 'POST', json: { login, password } }),
  register: (input: {
    displayName: string;
    email: string;
    username: string;
    password: string;
    accountType: AccountType;
    schoolId?: number;
  }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', json: input }),
};

export const publicApi = {
  schools: () => api<{ schools: { id: number; name: string }[] }>('/schools'),
};

export const meApi = {
  get: () =>
    api<{ user: User; children: Child[]; teacher: TeacherProfile | null; permissions: Permissions | null }>('/me'),
  connectChild: (studentCode: string, birthDate: string) =>
    api<{ child: Child }>('/me/children', { method: 'POST', json: { studentCode, birthDate } }),
  preferences: () => api<{ preferences: Record<NotificationType, boolean> }>('/me/notification-preferences'),
  setPreferences: (prefs: Partial<Record<NotificationType, boolean>>) =>
    api<{ preferences: Record<NotificationType, boolean> }>('/me/notification-preferences', { method: 'PUT', json: prefs }),
};

export const childApi = {
  profile: (id: number) => api<{ child: ChildProfile }>(child(id)),
  overview: (id: number) => api<Overview>(`${child(id)}/overview`),
  weekly: (id: number) => api<Weekly>(`${child(id)}/weekly`),
  calendar: (id: number, month: string) => api<{ month: string; entries: CalendarEntry[] }>(`${child(id)}/calendar${qs({ month })}`),
  pendant: (id: number) => api<{ pendant: Pendant }>(`${child(id)}/pendant`),

  lessons: (id: number, filters: { subject?: string; range?: LessonRange }) =>
    api<{ lessons: Lesson[] }>(`${child(id)}/lessons${qs(filters)}`),
  lesson: (id: number, slug: string) => api<{ lesson: LessonDetail }>(`${child(id)}/lessons/${encodeURIComponent(slug)}`),
  viewLesson: (id: number, slug: string) => api<void>(`${child(id)}/lessons/${encodeURIComponent(slug)}/view`, { method: 'POST' }),

  activities: (id: number, filters: { group?: ActivityGroup; state?: ActivityStateFilter }) =>
    api<{ activities: Activity[]; counts: ActivityCounts }>(`${child(id)}/activities${qs(filters)}`),
  activity: (id: number, slug: string) => api<{ activity: ActivityDetail }>(`${child(id)}/activities/${encodeURIComponent(slug)}`),
  setActivityStatus: (id: number, slug: string, status: ActivityStatus) =>
    api<{ activity: ActivityDetail }>(`${child(id)}/activities/${encodeURIComponent(slug)}/status`, {
      method: 'PATCH',
      json: { status },
    }),

  saved: (id: number) => api<Saved>(`${child(id)}/saved`),
  save: (id: number, type: SavedType, itemId: number) => api<void>(`${child(id)}/saved`, { method: 'POST', json: { type, itemId } }),
  unsave: (id: number, type: SavedType, itemId: number) => api<void>(`${child(id)}/saved/${type}/${itemId}`, { method: 'DELETE' }),

  notifications: (id: number) => api<{ notifications: AppNotification[] }>(`${child(id)}/notifications`),
  readNotification: (id: number, notificationId: number) =>
    api<void>(`${child(id)}/notifications/${notificationId}/read`, { method: 'POST' }),
  readAllNotifications: (id: number) => api<void>(`${child(id)}/notifications/read-all`, { method: 'POST' }),
};

export const teacherApi = {
  classes: () => api<{ classes: ClassAssignment[] }>('/teacher/classes'),
  lessons: () => api<{ lessons: TeacherLesson[] }>('/teacher/lessons'),
  lesson: (id: number) => api<{ lesson: TeacherLessonDetail }>(`/teacher/lessons/${id}`),
  createLesson: (input: LessonInput) => api<{ lesson: TeacherLessonDetail }>('/teacher/lessons', { method: 'POST', json: input }),
  updateLesson: (id: number, input: LessonInput) =>
    api<{ lesson: TeacherLessonDetail }>(`/teacher/lessons/${id}`, { method: 'PUT', json: input }),
  archiveLesson: (id: number, archived: boolean) =>
    api<{ lesson: TeacherLessonDetail }>(`/teacher/lessons/${id}/archive`, { method: 'PATCH', json: { archived } }),
  activities: () => api<{ activities: TeacherActivity[] }>('/teacher/activities'),
  activity: (id: number) => api<{ activity: TeacherActivityDetail }>(`/teacher/activities/${id}`),
  createActivity: (input: ActivityInput) =>
    api<{ activity: TeacherActivityDetail }>('/teacher/activities', { method: 'POST', json: input }),
  updateActivity: (id: number, input: ActivityInput) =>
    api<{ activity: TeacherActivityDetail }>(`/teacher/activities/${id}`, { method: 'PUT', json: input }),
  archiveActivity: (id: number, archived: boolean) =>
    api<{ activity: TeacherActivityDetail }>(`/teacher/activities/${id}/archive`, { method: 'PATCH', json: { archived } }),
};

export const adminApi = {
  users: (filters: { role?: Role; status?: UserStatus; q?: string }) => api<{ users: User[] }>(`/admin/users${qs(filters)}`),
  user: (id: number) => api<AdminUserDetail>(`/admin/users/${id}`),
  createUser: (input: { displayName: string; email: string; username: string; password: string; role: 'parent' | 'teacher' }) =>
    api<{ user: User }>('/admin/users', { method: 'POST', json: input }),
  updateUser: (id: number, patch: { role?: 'parent' | 'teacher'; status?: UserStatus }) =>
    api<AdminUserDetail>(`/admin/users/${id}`, { method: 'PATCH', json: patch }),
  setAssignments: (id: number, assignments: { sectionId: number; subjectId: number }[]) =>
    api<AdminUserDetail>(`/admin/users/${id}/assignments`, { method: 'PUT', json: { assignments } }),
  sections: () => api<{ sections: Section[] }>('/admin/sections'),
  createSection: (input: { grade: number; name: string; schoolYear: string }) =>
    api<{ section: Section }>('/admin/sections', { method: 'POST', json: input }),
  updateSection: (id: number, patch: Partial<{ grade: number; name: string; schoolYear: string; status: Section['status'] }>) =>
    api<{ section: Section }>(`/admin/sections/${id}`, { method: 'PATCH', json: patch }),
  subjects: () => api<{ subjects: { id: number; code: string; name: string; color: string }[] }>('/admin/subjects'),
  students: (filters: { sectionId?: number; status?: AdminStudent['status'] }) =>
    api<{ students: AdminStudent[] }>(
      `/admin/students${qs({ sectionId: filters.sectionId ? String(filters.sectionId) : undefined, status: filters.status })}`,
    ),
  createStudent: (input: { sectionId: number; firstName: string; lastName: string; birthDate: string }) =>
    api<{ student: AdminStudent }>('/admin/students', { method: 'POST', json: input }),
  updateStudent: (id: number, patch: Partial<{ sectionId: number; firstName: string; lastName: string; status: AdminStudent['status'] }>) =>
    api<{ student: AdminStudent }>(`/admin/students/${id}`, { method: 'PATCH', json: patch }),
};

export const superApi = {
  schools: () => api<{ schools: School[] }>('/super/schools'),
  createSchool: (name: string) => api<{ school: School }>('/super/schools', { method: 'POST', json: { name } }),
  updateSchool: (id: number, patch: Partial<{ name: string; status: School['status'] }>) =>
    api<{ school: School }>(`/super/schools/${id}`, { method: 'PATCH', json: patch }),
  users: (filters: { role?: Role; status?: UserStatus; schoolId?: number; q?: string }) =>
    api<{ users: User[] }>(
      `/super/users${qs({ role: filters.role, status: filters.status, q: filters.q, schoolId: filters.schoolId ? String(filters.schoolId) : undefined })}`,
    ),
  user: (id: number) => api<SuperUserDetail>(`/super/users/${id}`),
  createUser: (input: { displayName: string; email: string; username: string; password: string; role: Role; schoolId?: number }) =>
    api<SuperUserDetail>('/super/users', { method: 'POST', json: input }),
  updateUser: (id: number, patch: { role?: Role; status?: UserStatus; schoolId?: number | null }) =>
    api<SuperUserDetail>(`/super/users/${id}`, { method: 'PATCH', json: patch }),
  setPermissions: (id: number, patch: Partial<Record<Permission, boolean>>) =>
    api<SuperUserDetail>(`/super/users/${id}/permissions`, { method: 'PUT', json: patch }),
};
