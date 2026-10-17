import { isoDay, monthWeeks, to12Hour, to24Hour } from '@/utils/calendar';

test('isoDay pads month and day', () => {
  expect(isoDay(2026, 0, 5)).toBe('2026-01-05');
});

test('monthWeeks lays a month out Sunday-first in full weeks', () => {
  const oct = monthWeeks(2026, 9); // 1 Oct 2026 is a Thursday
  expect(oct[0]).toEqual([null, null, null, null, 1, 2, 3]);
  expect(oct.every((w) => w.length === 7)).toBe(true);
  expect(oct.flat().filter(Boolean)).toHaveLength(31);
  expect(monthWeeks(2024, 1).flat().filter(Boolean)).toHaveLength(29); // leap year
});

test.each([
  ['00:00', { hour: 12, minute: 0, pm: false }],
  ['09:05', { hour: 9, minute: 5, pm: false }],
  ['12:30', { hour: 12, minute: 30, pm: true }],
  ['23:45', { hour: 11, minute: 45, pm: true }],
])('%s round-trips through 12-hour parts', (value, parts) => {
  expect(to12Hour(value)).toEqual(parts);
  expect(to24Hour(parts.hour, parts.minute, parts.pm)).toBe(value);
});
