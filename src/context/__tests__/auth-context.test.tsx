import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { api, setAuthToken } from '@/services/api';
import { storage } from '@/services/storage';
import { fakeToken, json, makeUser, meBody, mockApi, networkDown } from '@/test-utils/api-mock';

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

const TOKEN_KEY = 'brightpath.token';
const mockStorage = storage as typeof storage & { reset: () => void };
const DAY = 24 * 60 * 60 * 1000;

async function renderAuth() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const hook = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return { ...hook, queryClient };
}

beforeEach(() => {
  mockStorage.reset();
  jest.clearAllMocks();
  setAuthToken(null);
});

describe('restoring a saved session', () => {
  it('starts signed out when nothing is saved', async () => {
    const { calls } = mockApi();
    const { result } = await renderAuth();

    expect(result.current.user).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('loads the profile for a saved token', async () => {
    const token = fakeToken('maria');
    await storage.set(TOKEN_KEY, token);
    const { callsTo } = mockApi({ 'GET /me': () => json(200, meBody()) });

    const { result } = await renderAuth();

    expect(result.current.user?.username).toBe('maria');
    expect(callsTo('GET /me')[0].headers.Authorization).toBe(`Bearer ${token}`);
    expect(callsTo('POST /auth/refresh')).toHaveLength(0); // fresh token: no renewal
  });

  it('renews a token older than a day and uses the new one afterwards', async () => {
    await storage.set(TOKEN_KEY, fakeToken('old', 2 * DAY));
    const renewed = fakeToken('renewed');
    const { callsTo } = mockApi({
      'GET /me': () => json(200, meBody()),
      'POST /auth/refresh': () => json(200, { token: renewed }),
    });

    const { result } = await renderAuth();
    await waitFor(() => expect(storage.set).toHaveBeenCalledWith(TOKEN_KEY, renewed));

    await act(() => result.current.refresh());
    expect(callsTo('GET /me').at(-1)?.headers.Authorization).toBe(`Bearer ${renewed}`);
  });

  it('keeps the session (and offers a retry) when the server is unreachable', async () => {
    const token = fakeToken('maria');
    await storage.set(TOKEN_KEY, token);
    const { routes } = mockApi({ 'GET /me': networkDown });

    const { result } = await renderAuth();

    expect(result.current.user).toBeNull();
    expect(result.current.connectionError).toMatch(/can't reach/i);
    expect(storage.remove).not.toHaveBeenCalled();
    expect(await storage.get(TOKEN_KEY)).toBe(token);

    routes['GET /me'] = () => json(200, meBody());
    await act(() => result.current.retry());
    expect(result.current.user?.username).toBe('maria');
    expect(result.current.connectionError).toBeNull();
  });

  it('forgets a token the server rejects and explains why on the sign-in screen', async () => {
    await storage.set(TOKEN_KEY, fakeToken('revoked'));
    mockApi({ 'GET /me': () => json(401, { error: 'Invalid or expired session', code: 'session_invalid' }) });

    const { result } = await renderAuth();

    await waitFor(() => expect(storage.remove).toHaveBeenCalledWith(TOKEN_KEY));
    expect(result.current.user).toBeNull();
    expect(result.current.notice).toMatch(/session has ended/i);
  });
});

describe('signing in and out', () => {
  it('only saves the token once the profile has loaded', async () => {
    const token = fakeToken('maria');
    const { routes } = mockApi({
      'POST /auth/login': () => json(200, { token, user: makeUser() }),
      'GET /me': () => json(500, { error: 'Internal server error' }),
    });
    const { result } = await renderAuth();

    await act(async () => {
      await expect(result.current.signIn('maria', 'pw')).rejects.toMatchObject({ status: 500 });
    });
    expect(storage.set).not.toHaveBeenCalledWith(TOKEN_KEY, expect.anything());
    expect(result.current.user).toBeNull();

    routes['GET /me'] = () => json(200, meBody());
    await act(() => result.current.signIn('maria', 'pw'));
    expect(result.current.user?.username).toBe('maria');
    expect(await storage.get(TOKEN_KEY)).toBe(token);
  });

  it('revokes the session on the server and clears every cached response', async () => {
    const token = fakeToken('maria');
    await storage.set(TOKEN_KEY, token);
    const { callsTo } = mockApi({
      'GET /me': () => json(200, meBody()),
      'POST /auth/logout': () => json(204),
    });
    const { result, queryClient } = await renderAuth();
    queryClient.setQueryData(['child', 1, 'overview'], { stats: {} });

    await act(() => result.current.signOut());

    expect(callsTo('POST /auth/logout')[0].headers.Authorization).toBe(`Bearer ${token}`);
    expect(result.current.user).toBeNull();
    expect(await storage.get(TOKEN_KEY)).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('still signs out locally when the server is offline', async () => {
    await storage.set(TOKEN_KEY, fakeToken('maria'));
    mockApi({ 'GET /me': () => json(200, meBody()), 'POST /auth/logout': networkDown });
    const { result } = await renderAuth();

    await act(() => result.current.signOut());

    expect(result.current.user).toBeNull();
    expect(await storage.get(TOKEN_KEY)).toBeNull();
  });
});

describe('while signed in', () => {
  it('signs out when any request reports the session is no longer valid', async () => {
    await storage.set(TOKEN_KEY, fakeToken('maria'));
    mockApi({
      'GET /me': () => json(200, meBody()),
      'GET /children/1/overview': () => json(401, { error: 'Invalid or expired session', code: 'session_invalid' }),
    });
    const { result } = await renderAuth();

    await act(async () => {
      await api('/children/1/overview').catch(() => {});
    });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(result.current.notice).toMatch(/session has ended/i);
  });

  it('reloads the profile when the server says the account changed (e.g. disabled school)', async () => {
    await storage.set(TOKEN_KEY, fakeToken('santos'));
    const school = { id: 1, name: 'Makati Elementary School', active: true };
    const teacher = makeUser({ username: 'santos', role: 'teacher', school });
    const { routes } = mockApi({
      'GET /me': () => json(200, meBody(teacher)),
      'GET /teacher/classes': () => json(403, { error: 'Your school is not active', code: 'school_inactive' }),
    });
    const { result } = await renderAuth();
    expect(result.current.user?.school?.active).toBe(true);

    routes['GET /me'] = () => json(200, meBody({ ...teacher, school: { ...school, active: false } }));
    await act(async () => {
      await api('/teacher/classes').catch(() => {});
    });

    await waitFor(() => expect(result.current.user?.school?.active).toBe(false));
  });
});
