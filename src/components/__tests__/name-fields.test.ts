import { EMPTY_NAME, isNameComplete, toPersonName } from '@/components/name-fields';

test('trims the parts and sends blanks as null', () => {
  expect(toPersonName({ firstName: ' Juan ', middleName: '  ', lastName: 'Dela Cruz ', suffix: '' })).toEqual({
    firstName: 'Juan',
    middleName: null,
    lastName: 'Dela Cruz',
    suffix: null,
  });
  expect(toPersonName({ ...EMPTY_NAME, firstName: 'A', middleName: 'Reyes', lastName: 'B', suffix: 'Jr.' })).toMatchObject({
    middleName: 'Reyes',
    suffix: 'Jr.',
  });
});

test('needs a first and last name', () => {
  expect(isNameComplete(EMPTY_NAME)).toBe(false);
  expect(isNameComplete({ ...EMPTY_NAME, firstName: 'A', lastName: ' ' })).toBe(false);
  expect(isNameComplete({ ...EMPTY_NAME, firstName: 'A', lastName: 'B' })).toBe(true);
});
