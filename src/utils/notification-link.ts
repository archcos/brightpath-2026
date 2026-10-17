import type { Href } from 'expo-router';

// Notification links come from the server (and from push payloads), so only known in-app screens are followed.
const PARENT_LINK = /^\/(?:(?:lesson|activity)\/[a-z0-9-]+|weekly)$/;
const TEACHER_LESSON = /^\/teacher\/lesson\/(\d+)$/;

/** Where a notification's `link` should open, or null if it isn't an allowed in-app screen. */
export function notificationHref(link: string | null | undefined): Href | null {
  if (!link) return null;
  const lessonId = link.match(TEACHER_LESSON)?.[1];
  if (lessonId) return { pathname: '/teacher/lesson/[id]', params: { id: lessonId } };
  return PARENT_LINK.test(link) ? (link as Href) : null;
}
