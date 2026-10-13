import { render, screen } from '@testing-library/react-native';

import { lastSyncLabel, PendantStatus } from '@/components/pendant-status';
import { SettingsProvider } from '@/context/settings-context';
import type { Pendant } from '@/types/api';

jest.mock('@/services/storage', () => ({
  storage: { get: jest.fn(async () => null), set: jest.fn(async () => {}), remove: jest.fn(async () => {}) },
}));

const pendant = (overrides: Partial<Pendant> = {}): Pendant => ({
  id: 1,
  code: 'TP-001',
  battery: 78,
  firmware: 'v1.4.2',
  connection: 'Bluetooth LE',
  online: true,
  lastSyncAt: '2026-10-11 09:00:00',
  teacher: { id: 1, name: 'Mrs. Santos', userId: 5 },
  ...overrides,
});

const renderStatus = (p: Pendant) =>
  render(
    <SettingsProvider>
      <PendantStatus pendant={p} />
    </SettingsProvider>,
  );

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 11, 15, 0));
});
afterAll(() => jest.useRealTimers());

it('shows the code, connection and battery', async () => {
  await renderStatus(pendant());
  expect(screen.getByText('TP-001')).toBeOnTheScreen();
  expect(screen.getByText('Connected')).toBeOnTheScreen();
  expect(screen.getByText('78%')).toBeOnTheScreen();
  expect(screen.queryByText(/low battery/i)).not.toBeOnTheScreen();
});

it('warns when the battery needs charging', async () => {
  await renderStatus(pendant({ battery: 15, online: false }));
  expect(screen.getByText('Offline')).toBeOnTheScreen();
  expect(screen.getByText(/low battery/i)).toBeOnTheScreen();
});

it('describes when it last synced', () => {
  expect(lastSyncLabel(pendant())).toBe('Synced today, 9:00 AM');
  expect(lastSyncLabel(pendant({ lastSyncAt: '2026-10-10 18:30:00' }))).toBe('Synced yesterday, 6:30 PM');
  expect(lastSyncLabel(pendant({ lastSyncAt: '2026-10-02 08:00:00' }))).toBe('Synced on October 2, 8:00 AM');
  expect(lastSyncLabel(pendant({ lastSyncAt: null }))).toBe('Never synced');
});
