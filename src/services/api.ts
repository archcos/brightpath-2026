import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * EXPO_PUBLIC_API_URL wins when set (always set it, with https, for production builds). In development
 * it can be left unset: the API is assumed to run on port 3000 of the machine serving the app, which keeps
 * phones and emulators working when the dev machine's LAN IP changes.
 */
function resolveApiOrigin() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (__DEV__) {
    const host =
      Platform.OS === 'web'
        ? typeof window !== 'undefined'
          ? window.location.hostname
          : undefined
        : Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

export const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${API_ORIGIN}/api/v1`;
const REQUEST_TIMEOUT_MS = 20_000;

/** 403 codes meaning "your account changed (pending, disabled, school deactivated)", not "wrong screen". */
const ACCOUNT_STATE_CODES = new Set(['account_pending', 'account_inactive', 'school_inactive']);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { field: string; message: string }[],
    /** Stable reason from the server, e.g. 'session_invalid' or 'account_pending'. */
    public code?: string,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
// Bumped whenever the signed-in identity changes. Responses to requests sent for an earlier session are
// dropped, so a slow reply meant for the previous user can never land in the next user's cache.
let sessionEpoch = 0;
let onUnauthorized: (() => void) | null = null;
let onAccountStateChanged: (() => void) | null = null;

/** Sets the token for a new identity (sign-in / sign-out). */
export function setAuthToken(token: string | null) {
  authToken = token;
  sessionEpoch++;
}

/** Swaps in a renewed token for the same session without invalidating requests in flight. */
export function replaceAuthToken(token: string) {
  authToken = token;
}

export const getAuthToken = () => authToken;

/** Called when the API rejects the token (expired/revoked) so the app can sign out. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Called when the server says the account's status or school changed, so the app can reload the profile. */
export function setAccountStateHandler(handler: (() => void) | null) {
  onAccountStateChanged = handler;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, signal, ...rest } = init;
  const epoch = sessionEpoch;
  const token = authToken;

  // Never let a request hang forever (e.g. the dev machine's IP changed); also honour the caller's signal.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(json !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(
      0,
      timedOut
        ? 'The BrightPath server is taking too long to respond. Please try again.'
        : "Can't reach the BrightPath server. Check your connection.",
      undefined,
      timedOut ? 'timeout' : 'network',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (epoch !== sessionEpoch) throw new ApiError(0, 'You were signed out.', undefined, 'stale_session');

  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && token) onUnauthorized?.();
  if (res.status === 403 && token && ACCOUNT_STATE_CODES.has(body?.code)) onAccountStateChanged?.();
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'Something went wrong', body?.details, body?.code);
  return (body ?? undefined) as T;
}

/** A user-facing message for any error, including field-level validation details from the API. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError && e.details?.length) return e.details.map((d) => d.message).join('\n');
  return e instanceof Error ? e.message : 'Something went wrong';
}
