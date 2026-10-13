import {
  api,
  ApiError,
  errorMessage,
  replaceAuthToken,
  setAccountStateHandler,
  setAuthToken,
  setUnauthorizedHandler,
} from '@/services/api';
import { hang, json, mockApi, networkDown } from '@/test-utils/api-mock';

beforeEach(() => {
  setAuthToken(null);
  setUnauthorizedHandler(null);
  setAccountStateHandler(null);
});

afterEach(() => jest.useRealTimers());

describe('requests', () => {
  it('sends the bearer token, JSON body and Accept header', async () => {
    const { calls } = mockApi({ 'POST /me/children': () => json(201, { child: { id: 7 } }) });
    setAuthToken('token-a');

    const res = await api<{ child: { id: number } }>('/me/children', { method: 'POST', json: { studentCode: 'BRP-123456' } });

    expect(res.child.id).toBe(7);
    expect(calls[0].headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-a',
    });
    expect(calls[0].body).toEqual({ studentCode: 'BRP-123456' });
  });

  it('sends no Authorization header when signed out', async () => {
    const { calls } = mockApi({ 'GET /schools': () => json(200, { schools: [] }) });
    await api('/schools');
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[0].headers['Content-Type']).toBeUndefined();
  });

  it('resolves 204 responses to undefined', async () => {
    mockApi({ 'POST /auth/logout': () => json(204) });
    setAuthToken('token-a');
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });
});

describe('errors', () => {
  it('maps error responses to ApiError with status, message, details and code', async () => {
    const details = [{ field: 'dueOn', message: 'Due date must be on or after the assigned date' }];
    mockApi({ 'POST /teacher/activities': () => json(400, { error: 'Invalid request', code: 'invalid', details }) });

    const error = await api('/teacher/activities', { method: 'POST', json: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Invalid request', code: 'invalid', details });
  });

  it('uses a generic message when the error body is not JSON', async () => {
    mockApi({ 'GET /me': () => json(502) });
    await expect(api('/me')).rejects.toMatchObject({ status: 502, message: 'Something went wrong' });
  });

  it('reports network failures as status 0 / code "network"', async () => {
    mockApi({ 'GET /me': networkDown });
    await expect(api('/me')).rejects.toMatchObject({ status: 0, code: 'network' });
  });

  it('gives up after 20 seconds instead of hanging forever', async () => {
    jest.useFakeTimers();
    mockApi({ 'GET /me': hang });

    const request = api('/me');
    jest.advanceTimersByTime(20_000);

    await expect(request).rejects.toMatchObject({ status: 0, code: 'timeout' });
  });

  it("passes the caller's own cancellation through untouched", async () => {
    mockApi({ 'GET /me': hang });
    const controller = new AbortController();

    const request = api('/me', { signal: controller.signal });
    controller.abort();

    const error = await request.catch((e) => e);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  it('errorMessage joins field details, or falls back to the message', () => {
    const withDetails = new ApiError(400, 'Invalid request', [
      { field: 'email', message: 'Invalid email' },
      { field: 'password', message: 'Too short' },
    ]);
    expect(errorMessage(withDetails)).toBe('Invalid email\nToo short');
    expect(errorMessage(new ApiError(409, 'Already connected'))).toBe('Already connected');
    expect(errorMessage('weird')).toBe('Something went wrong');
  });
});

describe('session handling', () => {
  it('calls the sign-out handler when a signed-in request gets 401', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockApi({ 'GET /me': () => json(401, { error: 'Invalid or expired session', code: 'session_invalid' }) });
    setAuthToken('expired');

    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not sign out on a 401 from a signed-out request (wrong password)', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockApi({ 'POST /auth/login': () => json(401, { error: 'Invalid email/username or password' }) });

    await expect(api('/auth/login', { method: 'POST', json: {} })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each(['account_pending', 'account_inactive', 'school_inactive'])(
    'asks the app to reload the profile on a 403 with code %p',
    async (code) => {
      const onAccountChanged = jest.fn();
      setAccountStateHandler(onAccountChanged);
      mockApi({ 'GET /teacher/classes': () => json(403, { error: 'Not active', code }) });
      setAuthToken('teacher');

      await expect(api('/teacher/classes')).rejects.toMatchObject({ status: 403, code });
      expect(onAccountChanged).toHaveBeenCalledTimes(1);
    },
  );

  it('does not reload the profile for an ordinary "wrong role" 403', async () => {
    const onAccountChanged = jest.fn();
    setAccountStateHandler(onAccountChanged);
    mockApi({ 'GET /super/schools': () => json(403, { error: 'You do not have access to this', code: 'forbidden' }) });
    setAuthToken('parent');

    await expect(api('/super/schools')).rejects.toMatchObject({ status: 403 });
    expect(onAccountChanged).not.toHaveBeenCalled();
  });

  it("drops a response that arrives after the user changed, so it can't leak into the next session", async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    let answer!: (r: Response) => void;
    mockApi({ 'GET /admin/users': () => new Promise<Response>((resolve) => (answer = resolve)) });
    setAuthToken('school-a-admin');

    const request = api('/admin/users');
    setAuthToken('school-b-admin'); // signed out and someone else signed in
    answer(json(401, { error: 'Invalid or expired session' }));

    await expect(request).rejects.toMatchObject({ code: 'stale_session' });
    // The new user's session must not be torn down by the old request's 401.
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('keeps requests in flight valid when the same session is renewed', async () => {
    let answer!: (r: Response) => void;
    mockApi({ 'GET /me': () => new Promise<Response>((resolve) => (answer = resolve)) });
    setAuthToken('old-token');

    const request = api<{ ok: boolean }>('/me');
    replaceAuthToken('renewed-token');
    answer(json(200, { ok: true }));

    await expect(request).resolves.toEqual({ ok: true });
  });
});
