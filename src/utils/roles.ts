import type { BadgeTone } from '@/components/ui/badge';
import type { Permission, Role, UserStatus } from '@/types/api';

export const ROLE_LABEL: Record<Role, string> = {
  parent: 'Parent',
  teacher: 'Teacher',
  admin: 'School Admin',
  super_admin: 'Super Admin',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  parent: "Sees their connected children's lessons and schoolwork",
  teacher: 'Posts lesson summaries and activities for assigned classes',
  admin: "Manages one school's accounts, students and sections",
  super_admin: 'Manages every school and every account',
};

/** Dropdown options for picking a role, with what each role can do. */
export const roleOptions = <R extends Role>(roles: R[]) =>
  roles.map((value) => ({ value, label: ROLE_LABEL[value], description: ROLE_DESCRIPTION[value] }));

export const STATUS_OPTIONS: { value: UserStatus; label: string; description: string }[] = [
  { value: 'active', label: 'Active', description: 'Can sign in and use BrightPath' },
  { value: 'pending', label: 'Pending', description: 'Waiting for approval' },
  { value: 'disabled', label: 'Disabled', description: "Can't sign in. Nothing is deleted; re-enable anytime." },
];

export const STATUS_TONE: Record<UserStatus, BadgeTone> = { active: 'success', pending: 'warning', disabled: 'danger' };

export const PERMISSION_LABEL: Record<Permission, { title: string; subtitle: string }> = {
  manage_teachers: { title: 'Manage teachers', subtitle: 'Approve or disable teachers and assign their classes' },
  manage_parents: { title: 'Manage parents', subtitle: 'Create, enable or disable parent accounts' },
  manage_students: { title: 'Manage students', subtitle: 'Add students, move sections, set active/inactive' },
  manage_sections: { title: 'Manage sections', subtitle: 'Add sections per grade and school year, archive old ones' },
};

/** Current school year, e.g. "2026-2027" (the Philippine school year starts around June). */
export function currentSchoolYear(date = new Date()) {
  const start = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${start + 1}`;
}
