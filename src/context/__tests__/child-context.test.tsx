import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChildProvider, useChild } from '@/context/child-context';
import { setAuthToken } from '@/services/api';
import { storage } from '@/services/storage';
import type { Child } from '@/types/api';
import { fakeToken, json, makeUser, meBody, mockApi } from '@/test-utils/api-mock';

jest.mock('@/services/storage', () => {
  const store = new Map<string, string>();
  return {
    storage: {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => void store.set(key, value)),
      remove: jest.fn(async (key: string) => void store.delete(key)),
      reset: () => store.clear(),
    },
  };
});

const child = (id: number, firstName: string): Child => ({
  id,
  firstName,
  lastName: 'Santos',
  avatar: '🧒',
  grade: 4,
  section: 'Rizal',
  sectionId: 1,
});

async function renderWithParent(userId: number, children: Child[]) {
  await storage.set('brightpath.token', fakeToken(`user-${userId}`));
  mockApi({
    'GET /me': () => json(200, meBody(makeUser({ id: userId }), children)),
    'POST /auth/logout': () => json(204),
  });
  const queryClient = new QueryClient();
  const wrapper = ({ children: content }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChildProvider>{content}</ChildProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
  const hook = await renderHook(() => ({ ...useChild(), auth: useAuth() }), { wrapper });
  await waitFor(() => expect(hook.result.current.auth.user?.id).toBe(userId));
  return hook;
}

beforeEach(() => {
  (storage as typeof storage & { reset: () => void }).reset();
  setAuthToken(null);
});

it('shows the first connected child by default', async () => {
  const { result } = await renderWithParent(1, [child(10, 'Sofia'), child(11, 'Miguel')]);
  expect(result.current.child?.firstName).toBe('Sofia');
});

it('remembers the selected child for that parent', async () => {
  const first = await renderWithParent(1, [child(10, 'Sofia'), child(11, 'Miguel')]);
  await act(async () => first.result.current.selectChild(11));
  expect(first.result.current.child?.firstName).toBe('Miguel');
  await first.unmount();

  // Same parent opens the app again.
  const again = await renderWithParent(1, [child(10, 'Sofia'), child(11, 'Miguel')]);
  await waitFor(() => expect(again.result.current.child?.firstName).toBe('Miguel'));
});

it("never applies one parent's selection to another parent on the same device", async () => {
  const first = await renderWithParent(1, [child(10, 'Sofia'), child(11, 'Miguel')]);
  await act(async () => first.result.current.selectChild(11));
  await first.unmount();

  const other = await renderWithParent(2, [child(20, 'Lucas'), child(11, 'Miguel')]);
  expect(other.result.current.child?.firstName).toBe('Lucas');
});
