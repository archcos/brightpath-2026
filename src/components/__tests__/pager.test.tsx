import { fireEvent, render, screen } from '@testing-library/react-native';

import { Pager } from '@/components/ui/pager';
import { SettingsProvider } from '@/context/settings-context';

jest.mock('@/services/storage', () => ({
  storage: { get: jest.fn(async () => null), set: jest.fn(async () => {}), remove: jest.fn(async () => {}) },
}));

const renderPager = (page: number, total: number, onChange = jest.fn()) =>
  render(
    <SettingsProvider>
      <Pager data={{ page, pageSize: 10, total }} onChange={onChange} />
    </SettingsProvider>,
  );

test('is hidden when everything fits on one page', async () => {
  await renderPager(1, 10);
  expect(screen.queryByText(/Page/)).toBeNull();
});

test('shows the page count and moves one page at a time', async () => {
  const onChange = jest.fn();
  await renderPager(2, 25, onChange);
  expect(screen.getByText('Page 2 of 3')).toBeTruthy();
  await fireEvent.press(screen.getByText('Next ›'));
  await fireEvent.press(screen.getByText('‹ Previous'));
  expect(onChange.mock.calls).toEqual([[3], [1]]);
});

test("can't go before the first page or past the last", async () => {
  const onChange = jest.fn();
  await renderPager(3, 25, onChange);
  await fireEvent.press(screen.getByText('Next ›'));
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Next ›' })).toBeDisabled();
});
