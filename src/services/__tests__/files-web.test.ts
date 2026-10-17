import { stripDataUrl } from '@/services/files.web';

test('takes the base64 part of a data URL and leaves plain base64 alone', () => {
  expect(stripDataUrl('data:application/vnd.ms-excel;base64,UEsDBA==')).toBe('UEsDBA==');
  expect(stripDataUrl('UEsDBA==')).toBe('UEsDBA==');
});
