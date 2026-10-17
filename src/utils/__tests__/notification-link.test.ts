import { notificationHref } from '@/utils/notification-link';

describe('notificationHref', () => {
  it('opens known parent and teacher screens', () => {
    expect(notificationHref('/lesson/plants-and-water')).toBe('/lesson/plants-and-water');
    expect(notificationHref('/activity/quiz-1')).toBe('/activity/quiz-1');
    expect(notificationHref('/weekly')).toBe('/weekly');
    expect(notificationHref('/teacher/lesson/42')).toEqual({ pathname: '/teacher/lesson/[id]', params: { id: '42' } });
  });

  it('ignores anything else, including links from a tampered push', () => {
    for (const link of [null, undefined, '', 'https://evil.test', '/lesson/../settings', '/admin/users', '/teacher/lesson/new', '//evil.test/lesson/x']) {
      expect(notificationHref(link)).toBeNull();
    }
  });
});
