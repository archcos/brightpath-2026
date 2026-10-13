// Helpers for tests that exercise services/api.ts (directly or through contexts) without a real server.
import type { User } from '@/types/api';

export type RecordedRequest = {
  method: string;
  /** Path relative to /api/v1, without the query string, e.g. "/me". */
  path: string;
  headers: Record<string, string>;
  body: unknown;
  signal?: AbortSignal | null;
};

type Handler = (req: RecordedRequest) => Response | Promise<Response>;

/** A minimal fetch Response with a JSON body (or no body for 204). */
export function json(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  } as unknown as Response;
}

/** Rejects like fetch does when the network is down. */
export const networkDown: Handler = () => Promise.reject(new TypeError('Network request failed'));

/** Never answers; rejects only when the request is aborted (timeouts, cancellations). */
export const hang: Handler = (req) =>
  new Promise((_, reject) => req.signal?.addEventListener('abort', () => reject(new Error('aborted'))));

/**
 * Replaces global fetch with a router keyed by "METHOD /path". Handlers can be swapped mid-test via
 * `routes`. Unknown routes fail loudly so tests never silently hit an unexpected endpoint.
 */
export function mockApi(initial: Record<string, Handler> = {}) {
  const routes: Record<string, Handler> = { ...initial };
  const calls: RecordedRequest[] = [];
  const fetchMock = jest.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api\/v1/, '').split('?')[0];
    const req: RecordedRequest = {
      method: init.method ?? 'GET',
      path,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      signal: init.signal,
    };
    calls.push(req);
    const handler = routes[`${req.method} ${path}`];
    if (!handler) throw new Error(`Unexpected request: ${req.method} ${path}`);
    return handler(req);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { routes, calls, fetchMock, callsTo: (key: string) => calls.filter((c) => `${c.method} ${c.path}` === key) };
}

/** A JWT-shaped token whose payload says it was issued `ageMs` ago. Only the client decodes it (to decide when to renew). */
export function fakeToken(name: string, ageMs = 0) {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const iat = Math.floor((Date.now() - ageMs) / 1000);
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: name, sid: name, iat })}.signature-${name}`;
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'maria@brightpath.test',
    username: 'maria',
    displayName: 'Maria',
    avatar: '👩',
    role: 'parent',
    status: 'active',
    school: null,
    createdAt: '2026-10-01 08:00:00',
    ...overrides,
  };
}

/** The body GET /me returns. */
export const meBody = (user: User = makeUser(), children: unknown[] = []) => ({
  user,
  children,
  teacher: null,
  permissions: null,
});
