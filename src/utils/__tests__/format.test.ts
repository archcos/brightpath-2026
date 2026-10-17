import {
  activityBadge,
  durationLabel,
  durationOptions,
  formatRelativeDay,
  formatTimeAgo,
  isValidISODate,
  CONNECTION_CODE,
  maskConnectionCode,
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

describe('isValidISODate', () => {
  it.each(['2018-11-02', '2024-02-29', '2026-12-31'])('accepts %p', (value) => {
    expect(isValidISODate(value)).toBe(true);
  });

  it.each(['2018-02-31', '2025-02-29', '2018-13-01', '2018-1-1', '', 'not-a-date'])('rejects %p', (value) => {
    expect(isValidISODate(value)).toBe(false);
  });
});

describe('maskConnectionCode', () => {
  it.each([
    ['abcd2345', 'ABCD-2345'],
    ['ABCD-2345', 'ABCD-2345'],
    ['abc', 'ABC'],
    ['abcd2', 'ABCD-2'],
    ['ABCD-23456789', 'ABCD-2345'],
    ['O0I1L', ''], // never in a code
  ])('%p → %p', (input, expected) => {
    expect(maskConnectionCode(input)).toBe(expected);
  });

  it('produces codes the server accepts', () => {
    expect(CONNECTION_CODE.test(maskConnectionCode('mgwa2753'))).toBe(true);
    expect(CONNECTION_CODE.test('BRP-1234')).toBe(false);
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

describe('durationOptions', () => {
  it('labels minutes and hours', () => {
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(90)).toBe('1 hr 30 min');
    expect(durationLabel(120)).toBe('2 hr');
  });

  it('keeps an unusual current length in the list, sorted, within 5–480', () => {
    const values = durationOptions('32').map((o) => Number(o.value));
    expect(values).toContain(32);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values[0]).toBe(15);
    expect(values.at(-1)).toBe(480);
    expect(durationOptions('999').map((o) => o.value)).not.toContain('999');
  });
});
