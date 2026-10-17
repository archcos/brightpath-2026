import type { ActivityState, ActivityStatus, ActivityType } from '@/types/api';

// The API returns local wall-clock strings ("YYYY-MM-DD" / "YYYY-MM-DD HH:MM:SS"); parse them as local time.
export function parseDate(value: string): Date {
  const [d, t = '00:00:00'] = value.split(' ');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  return new Date(y, m - 1, day, h, min);
}

export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** "Grade 4 - Faith": how schools in the Philippines name a section. */
export const sectionName = (grade: number, name: string) => `Grade ${grade} - ${name}`;

/** "1 student", "3 students". */
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

// Lesson lengths to pick from: 15–120 min in 5-minute steps, then longer blocks (server allows 5–480).
const DURATIONS = [...Array.from({ length: 22 }, (_, i) => 15 + i * 5), 150, 180, 240, 300, 360, 420, 480];

/** 45 → "45 min", 90 → "1 hr 30 min", 120 → "2 hr". */
export const durationLabel = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} hr${m ? ` ${m} min` : ''}` : `${min} min`;
};

/** The usual lengths, plus the lesson's own if it's an unusual one (e.g. 32 min from a recording). */
export const durationOptions = (current: string) =>
  [...new Set([...DURATIONS, Number(current)])]
    .filter((n) => n >= 5 && n <= 480)
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: durationLabel(n) }));

/** A one-time connection code, same rule as the server: 8 of A–Z/2–9 without 0, O, 1, I, L, as "ABCD-2345". */
export const CONNECTION_CODE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

/** "abcd2345" → "ABCD-2345" as the parent types; drops characters codes never contain. */
export function maskConnectionCode(text: string): string {
  const chars = text.toUpperCase().replace(/[^A-HJKMNP-Z2-9]/g, '').slice(0, 8);
  return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars;
}

/** True for a real calendar date in YYYY-MM-DD form (rejects e.g. 2018-02-31). */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseDate(value)) === value;
}

const dayDiff = (value: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseDate(value);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
};

export function formatTime(value: string): string {
  return parseDate(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatLongDate(value: string): string {
  return parseDate(value).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatMonthDay(value: string): string {
  return parseDate(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/** "Today", "Yesterday", "Tomorrow", otherwise "October 5". */
export function formatRelativeDay(value: string): string {
  const diff = dayDiff(value);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return formatMonthDay(value);
}

export function formatTimeAgo(value: string): string {
  const diff = dayDiff(value);
  if (diff === 0) return formatTime(value);
  if (diff === -1) return 'Yesterday';
  return `${-diff} days ago`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  assignment: 'Assignment',
  homework: 'Homework',
  activity: 'Activity',
  quiz: 'Quiz',
  exam: 'Exam',
  project: 'Project',
  presentation: 'Presentation',
  school_event: 'School Event',
  parent_meeting: 'Parent Meeting',
  field_trip: 'Field Trip',
};

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/** What a badge should say for an activity, combining due date state and the child's status. */
export function activityBadge(state: ActivityState, status: ActivityStatus): { label: string; tone: 'danger' | 'warning' | 'success' | 'info' | 'neutral' } {
  if (state === 'completed') return { label: 'Completed', tone: 'success' };
  if (state === 'overdue') return { label: 'Overdue', tone: 'danger' };
  if (state === 'past') return { label: 'Done', tone: 'neutral' };
  if (status === 'in_progress') return { label: 'In Progress', tone: 'warning' };
  if (state === 'due_today') return { label: 'Due Today', tone: 'warning' };
  return { label: 'Upcoming', tone: 'info' };
}
