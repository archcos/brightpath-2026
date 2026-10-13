import {
  activityBadge,
  formatRelativeDay,
  formatTimeAgo,
  isValidISODate,
  maskDate,
  maskStudentCode,
  parseDate,
  plural,
  toISODate,
} from '@/utils/format';

describe('parseDate / toISODate', () => {
  it('parses API date-times as local wall-clock time (never shifted by time zone)', () => {
    const d = parseDate('2026-10-11 09:30:00');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 11, 9, 30]);
  });

  it('parses a date-only string as local midnight', () => {
    const d = parseDate('2026-01-31');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 0, 31, 0]);
  });

  it('round-trips', () => {
    expect(toISODate(parseDate('2026-02-28 23:59:00'))).toBe('2026-02-28');
  });
});

describe('maskDate', () => {
  it.each([
    ['', ''],
    ['2026', '2026'],
    ['20261', '2026-1'],
    ['20261012', '2026-10-12'],
    ['2026-10-12', '2026-10-12'],
    ['2026/10/12', '2026-10-12'],
    ['2026101299', '2026-10-12'],
  ])('%p → %p', (input, expected) => {
    expect(maskDate(input)).toBe(expected);
  });

  it('lets the user backspace through the dash', () => {
    expect(maskDate('2026-1')).toBe('2026-1');
    expect(maskDate('2026-')).toBe('2026');
  });
});

describe('isValidISODate', () => {
  it.each(['2018-11-02', '2024-02-29', '2026-12-31'])('accepts %p', (value) => {
    expect(isValidISODate(value)).toBe(true);
  });

  it.each(['2018-02-31', '2025-02-29', '2018-13-01', '2018-1-1', '', 'not-a-date'])('rejects %p', (value) => {
    expect(isValidISODate(value)).toBe(false);
  });
});

describe('maskStudentCode', () => {
  it.each([
    ['123456', 'BRP-123456'],
    ['brp123456', 'BRP-123456'],
    ['BRP-12', 'BRP-12'],
    ['BRP-1234567', 'BRP-123456'],
  ])('%p → %p', (input, expected) => {
    expect(maskStudentCode(input)).toBe(expected);
  });

  it('can be cleared with backspace', () => {
    let value = 'BRP-1';
    for (const next of ['BRP-', 'BRP', 'BR', 'B', '']) {
      value = maskStudentCode(next);
      expect(value).toBe(next);
    }
  });
});

describe('plural', () => {
  it('handles singular, plural and irregular plurals', () => {
    expect(plural(1, 'student')).toBe('1 student');
    expect(plural(0, 'student')).toBe('0 students');
    expect(plural(3, 'child', 'children')).toBe('3 children');
  });
});

describe('relative dates', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 11, 15, 0)); // Sun Oct 11 2026, 3 PM local
  });
  afterAll(() => jest.useRealTimers());

  it('formatRelativeDay names nearby days and falls back to the date', () => {
    expect(formatRelativeDay('2026-10-11')).toBe('Today');
    expect(formatRelativeDay('2026-10-10 08:00:00')).toBe('Yesterday');
    expect(formatRelativeDay('2026-10-12')).toBe('Tomorrow');
    expect(formatRelativeDay('2026-10-20')).toBe('October 20');
  });

  it('formatTimeAgo shows the time today and days ago otherwise', () => {
    expect(formatTimeAgo('2026-10-11 09:05:00')).toBe('9:05 AM');
    expect(formatTimeAgo('2026-10-10 09:05:00')).toBe('Yesterday');
    expect(formatTimeAgo('2026-10-07 09:05:00')).toBe('4 days ago');
  });
});

describe('activityBadge', () => {
  it.each([
    ['completed', 'not_started', 'Completed', 'success'],
    ['overdue', 'in_progress', 'Overdue', 'danger'],
    ['past', 'not_started', 'Done', 'neutral'],
    ['upcoming', 'in_progress', 'In Progress', 'warning'],
    ['due_today', 'not_started', 'Due Today', 'warning'],
    ['upcoming', 'not_started', 'Upcoming', 'info'],
  ] as const)('state %p + status %p → %p', (state, status, label, tone) => {
    expect(activityBadge(state, status)).toEqual({ label, tone });
  });
});
