// Pure helpers for the in-app calendar and time picker (components/ui/date-field).

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" for a year, 0-based month and day. */
export const isoDay = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/**
 * The weeks of a month as rows of 7 (Sunday first). Days outside the month are null.
 * e.g. October 2026 starts on a Thursday → first row [null, null, null, null, 1, 2, 3].
 */
export function monthWeeks(year: number, month: number): (number | null)[][] {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** "HH:MM" (24 h) → 12-hour parts. */
export function to12Hour(value: string) {
  const [h, minute] = value.split(':').map(Number);
  return { hour: h % 12 || 12, minute, pm: h >= 12 };
}

/** 12-hour parts → "HH:MM" (24 h). */
export const to24Hour = (hour: number, minute: number, pm: boolean) => `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`;
