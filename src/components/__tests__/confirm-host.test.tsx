import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmHost } from '@/components/ui/confirm-host';
import { SettingsProvider } from '@/context/settings-context';
import { confirmAction, confirmDestructive } from '@/utils/confirm';

jest.mock('@/services/storage', () => ({
  storage: { get: jest.fn(async () => null), set: jest.fn(async () => {}), remove: jest.fn(async () => {}) },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const renderHost = () =>
  render(
    <SettingsProvider>
      <ConfirmHost />
    </SettingsProvider>,
  );

test('resolves true when the action is confirmed', async () => {
  await renderHost();
  let answer: Promise<boolean> = Promise.resolve(false);
  await act(async () => {
    answer = confirmDestructive('Archive lesson?', 'Parents will no longer see it.', 'Archive');
  });
  expect(screen.getByText('Parents will no longer see it.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Archive'));
  await expect(answer).resolves.toBe(true);
});

test('resolves false on Cancel, and a newer question cancels an open one', async () => {
  await renderHost();
  let first: Promise<boolean> = Promise.resolve(true);
  let second: Promise<boolean> = Promise.resolve(true);
  await act(async () => {
    first = confirmAction('Save changes?', 'One', 'Save');
    second = confirmAction('Create lesson?', 'Two', 'Create');
  });
  await expect(first).resolves.toBe(false);
  expect(screen.getByText('Two')).toBeTruthy();
  await fireEvent.press(screen.getByText('Cancel'));
  await expect(second).resolves.toBe(false);
});
