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
  PendantKey,
  PersonName,
  Permission,
  Permissions,
  Recording,
  Role,
  Saved,
  School,
  Section,
  Sex,
  StudentCode,
  StudentDetail,
  SuperUserDetail,
  TeacherActivity,
  TeacherActivityDetail,
  TeacherLesson,
  TeacherLessonDetail,
  TeacherNotification,
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
  register: (input: PersonName & {
    sex: Sex;
    email: string;
    username: string;
    password: string;
    accountType: AccountType;
    schoolId?: number;
  }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', json: input }),
  /** Revokes this device's session on the server. */
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  /** A fresh token for the current session. The expiry stays the same: a sign-in lasts 90 days. */
  refresh: () => api<{ token: string }>('/auth/refresh', { method: 'POST' }),
  /** Emails a 6-digit reset code if the account exists (the server answers the same either way). */
  forgotPassword: (login: string) => api<void>('/auth/forgot-password', { method: 'POST', json: { login } }),
  /** Checks the emailed code without using it up (a wrong one counts toward its 5 tries). */
  verifyResetCode: (login: string, code: string) =>
    api<void>('/auth/verify-reset-code', { method: 'POST', json: { login, code } }),
  /** Sets a new password with the emailed code; every device is signed out. */
  resetPassword: (login: string, code: string, password: string) =>
    api<void>('/auth/reset-password', { method: 'POST', json: { login, code, password } }),
};

export const publicApi = {
  schools: () => api<{ schools: { id: number; name: string }[] }>('/schools'),
};

export const meApi = {
  get: () =>
    api<{ user: User; children: Child[]; teacher: TeacherProfile | null; permissions: Permissions | null }>('/me'),
  /** This device gets push notifications while the current session lasts. */
  pushToken: (token: string) => api<void>('/me/push-token', { method: 'PUT', json: { token } }),
  /** `code` is a one-time connection code ("ABCD-2345") from the child's teacher or school admin. */
  connectChild: (code: string, birthDate: string) =>
    api<{ child: Child }>('/me/children', { method: 'POST', json: { code, birthDate } }),
  preferences: () => api<{ preferences: Record<NotificationType, boolean> }>('/me/notification-preferences'),
  setPreferences: (prefs: Partial<Record<NotificationType, boolean>>) =>
    api<{ preferences: Record<NotificationType, boolean> }>('/me/notification-preferences', { method: 'PUT', json: prefs }),
};

export const childApi = {
  profile: (id: number) => api<{ child: ChildProfile }>(child(id)),
  overview: (id: number) => api<Overview>(`${child(id)}/overview`),
  weekly: (id: number) => api<Weekly>(`${child(id)}/weekly`),
  calendar: (id: number, month: string) => api<{ month: string; entries: CalendarEntry[] }>(`${child(id)}/calendar${qs({ month })}`),

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

/** A generated file (template or code list), base64-encoded so the app saves it the same way everywhere. */
export type FilePayload = { filename: string; mimeType: string; base64: string };

export type StudentFilters = { sectionId?: number; status?: AdminStudent['status'] };

/**
 * Students, their one-time parent codes and parent links. Teachers (their sections) and school admins
 * (their school) use the same endpoints under their own prefix; the server applies the scope.
 */
const rosterApi = (base: '/teacher' | '/admin') => ({
  students: (filters: StudentFilters) =>
    api<{ students: AdminStudent[] }>(
      `${base}/students${qs({ sectionId: filters.sectionId ? String(filters.sectionId) : undefined, status: filters.status })}`,
    ),
  /** Also issues the student's first one-time code. */
  createStudent: (input: PersonName & { sex: Sex; sectionId: number; birthDate: string }) =>
    api<{ student: AdminStudent; code: StudentCode }>(`${base}/students`, { method: 'POST', json: input }),
  student: (id: number) => api<StudentDetail>(`${base}/students/${id}`),
  issueCode: (id: number) => api<{ code: StudentCode }>(`${base}/students/${id}/codes`, { method: 'POST' }),
  revokeCode: (id: number, codeId: number) =>
    api<StudentDetail>(`${base}/students/${id}/codes/${codeId}/revoke`, { method: 'POST' }),
  removeParent: (id: number, parentId: number) =>
    api<StudentDetail>(`${base}/students/${id}/parents/${parentId}/remove`, { method: 'POST' }),
  /** The .xlsx layout for importing students. */
  importTemplate: () => api<FilePayload>(`${base}/students/import-template`),
  /** Adds every row of a filled-in template to a section (all or nothing); each gets a one-time code. */
  importStudents: (input: { sectionId: number; file: string }) =>
    api<{ created: { student: AdminStudent; code: StudentCode }[] }>(`${base}/students/import`, { method: 'POST', json: input }),
  /** A code per active student (issued if missing), without birth dates: Excel list or PDF slips. */
  exportCodes: (sectionId: number, format: 'xlsx' | 'pdf') =>
    api<FilePayload>(`${base}/sections/${sectionId}/codes-export`, { method: 'POST', json: { format } }),
});

export type RosterApi = ReturnType<typeof rosterApi>;

export const teacherApi = {
  ...rosterApi('/teacher'),
  /** Whether the school lets teachers add sections, which school years are open, and the subject list. */
  sectionOptions: () =>
    api<{ allowed: boolean; schoolYears: string[]; subjects: { id: number; code: string; name: string; color: string }[] }>(
      '/teacher/sections/options',
    ),
  addSection: (input: { grade: number; name: string; schoolYear: string; subjectIds: number[] }) =>
    api<{ classes: ClassAssignment[] }>('/teacher/sections', { method: 'POST', json: input }),
  /** `classes`: taught now (post and manage students). `pastClasses`: earlier years / ended, read-only. */
  classes: () => api<{ classes: ClassAssignment[]; pastClasses: ClassAssignment[] }>('/teacher/classes'),
  /** The pendant this teacher wears, or null. */
  pendant: () => api<{ pendant: Pendant | null }>('/teacher/pendant'),
  notifications: () => api<{ notifications: TeacherNotification[] }>('/teacher/notifications'),
  readNotification: (id: number) => api<void>(`/teacher/notifications/${id}/read`, { method: 'PATCH' }),
  recordings: () => api<{ recordings: Recording[] }>('/teacher/recordings'),
  /** Attach a recording to one of the teacher's lessons; it is (re)summarized in the background. */
  attachRecording: (id: number, lessonId: number) =>
    api<void>(`/teacher/recordings/${id}`, { method: 'PUT', json: { lessonId } }),
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
  createUser: (input: PersonName & { sex: Sex; email: string; username: string; password: string; role: 'parent' | 'teacher' }) =>
    api<{ user: User }>('/admin/users', { method: 'POST', json: input }),
  updateUser: (id: number, patch: { role?: 'parent' | 'teacher'; status?: UserStatus }) =>
    api<AdminUserDetail>(`/admin/users/${id}`, { method: 'PATCH', json: patch }),
  setAssignments: (id: number, assignments: { sectionId: number; subjectId: number }[]) =>
    api<AdminUserDetail>(`/admin/users/${id}/assignments`, { method: 'PUT', json: { assignments } }),
  /** Give a teacher a pendant from the pool, or take theirs back with null. */
  assignPendant: (userId: number, pendantId: number | null) =>
    api<AdminUserDetail>(`/admin/users/${userId}/pendant`, { method: 'PUT', json: { pendantId } }),
  pendants: () => api<{ pendants: Pendant[] }>('/admin/pendants'),
  /** The response's deviceKey is shown only once: it goes into the pendant's firmware. */
  registerPendant: (code: string) =>
    api<{ pendant: Pendant & { deviceKey: string } }>('/admin/pendants', { method: 'POST', json: { code } }),
  /** Adds an upload key for a pendant (shown once). Older keys keep working until revoked. */
  newPendantKey: (id: number) => api<{ deviceKey: string }>(`/admin/pendants/${id}/key`, { method: 'POST' }),
  pendantKeys: (id: number) => api<{ keys: PendantKey[] }>(`/admin/pendants/${id}/keys`),
  revokePendantKey: (id: number, keyId: number) =>
    api<{ keys: PendantKey[] }>(`/admin/pendants/${id}/keys/${keyId}/revoke`, { method: 'POST' }),
  takeBackPendant: (id: number) => api<{ pendant: Pendant }>(`/admin/pendants/${id}/take-back`, { method: 'POST' }),
  settings: () => api<{ teachersAddSections: boolean }>('/admin/settings'),
  updateSettings: (patch: { teachersAddSections: boolean }) =>
    api<{ teachersAddSections: boolean }>('/admin/settings', { method: 'PATCH', json: patch }),
  sections: () => api<{ sections: Section[] }>('/admin/sections'),
  createSection: (input: { grade: number; name: string; schoolYear: string }) =>
    api<{ section: Section }>('/admin/sections', { method: 'POST', json: input }),
  updateSection: (id: number, patch: Partial<{ grade: number; name: string; schoolYear: string; status: Section['status'] }>) =>
    api<{ section: Section }>(`/admin/sections/${id}`, { method: 'PATCH', json: patch }),
  subjects: () => api<{ subjects: { id: number; code: string; name: string; color: string }[] }>('/admin/subjects'),
  ...rosterApi('/admin'),
  updateStudent: (id: number, patch: Partial<PersonName & { sectionId: number; status: AdminStudent['status'] }>) =>
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
  createUser: (input: PersonName & { sex: Sex; email: string; username: string; password: string; role: Role; schoolId?: number }) =>
    api<SuperUserDetail>('/super/users', { method: 'POST', json: input }),
  updateUser: (id: number, patch: { role?: Role; status?: UserStatus; schoolId?: number | null }) =>
    api<SuperUserDetail>(`/super/users/${id}`, { method: 'PATCH', json: patch }),
  setPermissions: (id: number, patch: Partial<Record<Permission, boolean>>) =>
    api<SuperUserDetail>(`/super/users/${id}/permissions`, { method: 'PUT', json: patch }),
};
