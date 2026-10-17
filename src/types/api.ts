// Response shapes of the BrightPath API (server/src/services/*).

export type Subject = { code?: string; name: string; color: string };

export type Role = 'parent' | 'teacher' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'pending' | 'disabled';

export type User = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  role: Role;
  status: UserStatus;
  /** Teachers and school admins only. `active` is false when a super admin deactivated the school. */
  school: { id: number; name: string; active?: boolean } | null;
  createdAt: string;
};

export type Permission = 'manage_teachers' | 'manage_parents' | 'manage_students' | 'manage_sections';
export type Permissions = Record<Permission, boolean>;

export type School = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  admins: number;
  pendingAdmins: number;
  teachers: number;
  students: number;
};

export type ClassAssignment = {
  sectionId: number;
  grade: number;
  section: string;
  subject: Required<Subject> & { id: number };
  studentCount: number;
};

export type TeacherProfile = { id: number | null; name: string | null; classes: ClassAssignment[] };

export type Child = {
  id: number;
  firstName: string;
  lastName: string;
  avatar: string;
  grade: number;
  section: string;
  sectionId: number;
};

export type ChildProfile = Child & {
  school: string;
  adviser: string | null;
  studentCode: string;
  subjects: Required<Subject>[];
};

export type Lesson = {
  id: number;
  slug: string;
  title: string;
  startsAt: string;
  durationMin: number;
  summaryStatus: 'preparing' | 'ready';
  subject: Subject;
  teacher: string;
};

export type ActivityType =
  | 'assignment'
  | 'homework'
  | 'activity'
  | 'quiz'
  | 'exam'
  | 'project'
  | 'presentation'
  | 'school_event'
  | 'parent_meeting'
  | 'field_trip';

export type ActivityStatus = 'not_started' | 'in_progress' | 'completed';
export type ActivityState = 'upcoming' | 'due_today' | 'overdue' | 'completed' | 'past';

export type Activity = {
  id: number;
  slug: string;
  type: ActivityType;
  isEvent: boolean;
  title: string;
  description: string;
  instructions: string | null;
  assignedOn: string;
  dueOn: string;
  reviewSuggested: boolean;
  subject: Subject;
  teacher: string | null;
  lesson: { slug: string; title: string; startsAt: string } | null;
  status: ActivityStatus;
  state: ActivityState;
};

export type ActivityDetail = Activity & { topics: string[]; saved: boolean };

export type LessonDetail = Lesson & {
  summary: string | null;
  keyPoints: { emoji: string; text: string }[];
  words: { id: number; word: string; saved: boolean }[];
  rememberThis: string | null;
  askChild: string | null;
  tryTogether: string | null;
  saved: boolean;
  activities: Activity[];
};

export type WeekStats = {
  lessons: number;
  summariesAvailable: number;
  lessonsReviewed: number;
  assignments: number;
  completed: number;
  pending: number;
};

export type Overview = {
  stats: { lessonsToday: number; tasksDue: number; upcomingQuizzes: number; needsAttention: number };
  todayLessons: Lesson[];
  needsAttention: Activity[];
  comingUp: Activity[];
  nextQuiz: ActivityDetail | null;
  recentSummaries: Lesson[];
  week: WeekStats & { start: string; end: string };
  unreadNotifications: number;
};

export type Weekly = {
  start: string;
  end: string;
  stats: WeekStats;
  comingUp: Activity[];
  later: string[];
  learned: { subject: string; color: string; title: string; slug: string }[];
  tips: string[];
};

export type CalendarEntry =
  | { kind: 'lesson'; slug: string; title: string; date: string; time: string; subject: Subject }
  | { kind: 'activity'; slug: string; title: string; date: string; type: ActivityType; state: ActivityState; subject: Subject };

export type ActivityCounts = { dueToday: number; overdue: number; upcoming: number; completed: number };

export type Saved = {
  lessons: { id: number; slug: string; title: string; startsAt: string; subject: Subject }[];
  words: { id: number; word: string; lesson: { slug: string; title: string }; subject: Subject }[];
  activities: { id: number; slug: string; title: string; type: ActivityType; dueOn: string; subject: Subject }[];
};

export type NotificationType =
  | 'lesson_summary'
  | 'new_assignment'
  | 'due_tomorrow'
  | 'overdue'
  | 'quiz_reminder'
  | 'exam_reminder'
  | 'school_event'
  | 'assignment_completed'
  | 'weekly_summary';

export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

/** A recording pendant. Worn by at most one teacher; only that teacher and school admins ever see it. */
export type Pendant = {
  id: number;
  code: string;
  battery: number;
  firmware: string;
  connection: string;
  online: boolean;
  /** Null until the device has synced for the first time. */
  lastSyncAt: string | null;
  /** Who wears it. `userId` is null for teacher profiles without a login. */
  teacher: { id: number; name: string; userId: number | null } | null;
};

// --- Teacher ---------------------------------------------------------------------------

type TeacherSubject = { id: number; code: string; name: string; color: string };

export type TeacherLesson = {
  id: number;
  slug: string;
  title: string;
  startsAt: string;
  durationMin: number;
  summaryStatus: 'preparing' | 'ready';
  /** Set when the recording pipeline wrote the summary draft. */
  aiDraftAt: string | null;
  /** When an unreviewed draft is published to parents automatically (null once published). */
  autoPublishAt: string | null;
  archived: boolean;
  sectionId: number;
  section: string;
  subject: TeacherSubject;
};

export type TeacherLessonDetail = TeacherLesson & {
  summary: string | null;
  rememberThis: string | null;
  askChild: string | null;
  tryTogether: string | null;
  keyPoints: { emoji: string; text: string }[];
  words: string[];
};

/** A teacher's in-app notification, e.g. a reminder to review an AI summary before it is published. */
export type TeacherNotification = {
  id: number;
  type: 'summary_review';
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

/** A pendant recording that needs the teacher: no lesson matched its time, or processing failed. */
export type Recording = { id: number; startedAt: string; status: 'unmatched' | 'failed'; error: string | null };

export type LessonInput = {
  sectionId: number;
  subjectId: number;
  title: string;
  startsAt: string; // YYYY-MM-DD HH:MM
  durationMin: number;
  summaryStatus: 'preparing' | 'ready';
  summary?: string;
  rememberThis?: string;
  askChild?: string;
  tryTogether?: string;
  keyPoints: { emoji: string; text: string }[];
  words: string[];
};

export type TeacherActivity = {
  id: number;
  slug: string;
  type: ActivityType;
  title: string;
  description: string;
  instructions: string | null;
  assignedOn: string;
  dueOn: string;
  reviewSuggested: boolean;
  archived: boolean;
  sectionId: number;
  section: string;
  subject: TeacherSubject;
  lessonId: number | null;
  lessonTitle: string | null;
};

export type TeacherActivityDetail = TeacherActivity & {
  topics: string[];
  progress: { students: number; completed: number; inProgress: number };
};

export type ActivityInput = {
  sectionId: number;
  subjectId: number;
  lessonId: number | null;
  type: ActivityType;
  title: string;
  description: string;
  instructions?: string;
  assignedOn: string;
  dueOn: string;
  reviewSuggested: boolean;
  topics: string[];
};

// --- Admin -----------------------------------------------------------------------------

export type AdminUserDetail = {
  user: User;
  /** School admins can only edit parents and teachers. */
  editable: boolean;
  assignments: { sectionId: number; subjectId: number }[];
  /** The pendant this teacher wears (teachers only). */
  pendant: Pendant | null;
  children: { id: number; firstName: string; lastName: string; grade: number; section: string }[];
};

export type Section = {
  id: number;
  grade: number;
  name: string;
  schoolYear: string;
  status: 'active' | 'archived';
  adviser: string | null;
  students: number;
};

export type AdminStudent = {
  id: number;
  firstName: string;
  lastName: string;
  avatar: string;
  studentCode: string;
  birthDate: string;
  status: 'active' | 'inactive';
  section: { id: number; grade: number; name: string; schoolYear: string };
  parents: number;
};

export type SuperUserDetail = {
  user: User;
  permissions: Permissions | null;
  assignments: { sectionId: number; subjectId: number }[];
};
