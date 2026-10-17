import type { SelectOption } from '@/components/ui/select';
import type { ClassAssignment } from '@/types/api';
import { plural, sectionName } from '@/utils/format';

/** "sectionId:subjectId": one class (a subject taught to a section). */
export const classKey = (c: { sectionId: number; subject: { id: number } }) => `${c.sectionId}:${c.subject.id}`;

/** The school year the teacher teaches in now (the latest one with a current class), else the latest one seen. */
export function currentSchoolYear(classes: ClassAssignment[], past: ClassAssignment[] = []): string {
  const years = (classes.length ? classes : past).map((c) => c.schoolYear).sort();
  return years.at(-1) ?? '';
}

/** Every school year the teacher has classes in, newest first. */
export const schoolYears = (classes: ClassAssignment[], past: ClassAssignment[] = []) =>
  [...new Set([...classes, ...past].map((c) => c.schoolYear))].sort().reverse();

/**
 * Class dropdown options grouped under "Grade 4" etc. `readOnly` classes (an earlier school year or an
 * ended assignment) are mixed in by grade and marked read-only.
 */
export function classOptions(classes: ClassAssignment[], readOnly: ClassAssignment[] = []): SelectOption[] {
  return [...classes.map((c) => ({ c, past: false })), ...readOnly.map((c) => ({ c, past: true }))]
    .sort(
      (a, b) =>
        a.c.grade - b.c.grade || a.c.section.localeCompare(b.c.section) || a.c.subject.name.localeCompare(b.c.subject.name),
    )
    .map(({ c, past }) => ({
      value: classKey(c),
      label: `${sectionName(c.grade, c.section)} • ${c.subject.name}`,
      description: past ? `Read-only • ${c.schoolYear}` : plural(c.studentCount, 'student'),
      group: `Grade ${c.grade}`,
    }));
}
