import type { ClassAssignment } from '@/types/api';
import { classKey, classOptions, currentSchoolYear, schoolYears } from '@/utils/classes';

const cls = (sectionId: number, grade: number, subjectId: number, schoolYear = '2026-2027'): ClassAssignment => ({
  sectionId,
  grade,
  section: `Section ${sectionId}`,
  schoolYear,
  subject: { id: subjectId, code: 'math', name: 'Math', color: '#000000' },
  studentCount: 2,
});

test('groups classes by grade, with read-only ones mixed in by grade', () => {
  const options = classOptions([cls(2, 4, 1), cls(1, 3, 1)], [cls(9, 3, 2)]);
  expect(options.map((o) => o.group)).toEqual(['Grade 3', 'Grade 3', 'Grade 4']);
  expect(options.find((o) => o.value === '9:2')?.description).toMatch(/read-only/i);
  expect(options[0].label).toBe('Grade 3 - Section 1 • Math');
  expect(options[0].value).toBe(classKey(cls(1, 3, 1)));
});

test('school years come newest first, and the current one is where the teacher teaches now', () => {
  // A teacher who taught Grade 5 last year and Grade 3 this year: years, not grades, decide what is current.
  const now = [cls(1, 3, 1, '2026-2027')];
  const before = [cls(2, 5, 1, '2025-2026'), cls(3, 4, 1, '2024-2025')];
  expect(schoolYears(now, before)).toEqual(['2026-2027', '2025-2026', '2024-2025']);
  expect(currentSchoolYear(now, before)).toBe('2026-2027');
  expect(currentSchoolYear([], before)).toBe('2025-2026');
});
