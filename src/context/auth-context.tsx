import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import {
  ApiError,
  getAuthToken,
  replaceAuthToken,
  setAccountStateHandler,
  setAuthToken,
  setUnauthorizedHandler,
} from '@/services/api';
import { authApi, meApi, type AccountType } from '@/services/brightpath';
import { storage } from '@/services/storage';
import type { Child, Permissions, TeacherProfile, User } from '@/types/api';

const TOKEN_KEY = 'brightpath.token';
/** Renew the session token once it's older than this, so devices in regular use stay signed in. */
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
/** Reload the profile at most this often when the app comes back to the foreground. */
const FOREGROUND_REFRESH_MS = 60 * 1000;

/** When the token was issued (ms), read from its payload. Only used to decide when to renew. */
function issuedAt(token: string): number | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { iat } = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)));
    return typeof iat === 'number' ? iat * 1000 : null;
  } catch {
    return null;
  }
}

type SignUpInput = {
  displayName: string;
  email: string;
  username: string;
  password: string;
  accountType: AccountType;
  schoolId?: number;
};

type AuthContextValue = {
  isLoading: boolean;
  user: User | null;
  /** Connected children (parents only). */
  children: Child[];
  /** Classes and profile (active teachers only). */
  teacher: TeacherProfile | null;
  /** What a school admin may do (school admins only). */
  permissions: Permissions | null;
  /** Set when a saved session couldn't be checked because the server is unreachable. */
  connectionError: string | null;
  /** A message for the sign-in screen, e.g. after the session expired. */
  notice: string | null;
  /** `login` is an email or a username. */
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reloads the profile (role, status, children, permissions) from the server. */
  refresh: () => Promise<void>;
  /** Tries to restore the saved session again after a connection error. */
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children: content }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const lastLoadedAt = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);

  /** Forgets the session on this device: token, profile and every cached response. */
  const clearLocal = useCallback(async () => {
    setAuthToken(null);
    setConnectionError(null);
    setUser(null);
    setChildren([]);
    setTeacher(null);
    setPermissions(null);
    await queryClient.cancelQueries();
    queryClient.clear();
    await storage.remove(TOKEN_KEY);
  }, [queryClient]);

  const signOut = useCallback(async () => {
    // Revoke the session server-side without making the user wait (or fail when offline).
    if (getAuthToken()) authApi.logout().catch(() => {});
    setNotice(null);
    await clearLocal();
  }, [clearLocal]);

  const loadMe = useCallback(async () => {
    const me = await meApi.get();
    setUser(me.user);
    setChildren(me.children);
    setTeacher(me.teacher);
    setPermissions(me.permissions);
    setConnectionError(null);
    lastLoadedAt.current = Date.now();
  }, []);

  // Concurrent callers (focus, 403 handler, pull-to-refresh) share one request.
  const refresh = useCallback(() => {
    inFlight.current ??= loadMe().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [loadMe]);

  const renewIfOld = useCallback(async (token: string) => {
    const iat = issuedAt(token);
    if (iat === null || Date.now() - iat < RENEW_AFTER_MS) return;
    try {
      const { token: fresh } = await authApi.refresh();
      replaceAuthToken(fresh);
      await storage.set(TOKEN_KEY, fresh);
    } catch {
      // Not fatal: the current token keeps working until it expires.
    }
  }, []);

  /** Resumes the session saved on this device (if any). */
  const restoreFrom = useCallback(async (token: string | null) => {
    try {
      if (!token) return;
      setAuthToken(token);
      await loadMe();
      void renewIfOld(token);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500) && e.code !== 'stale_session') {
        // The server is unreachable, not rejecting us: keep the saved session and offer a retry.
        setConnectionError(e.message);
      } else {
        await clearLocal();
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearLocal, loadMe, renewIfOld]);

  // Reading the keychain/keystore can fail (e.g. after an OS restore); treat that as signed out.
  const restore = useCallback(
    () =>
      storage
        .get(TOKEN_KEY)
        .catch(() => null)
        .then(restoreFrom),
    [restoreFrom],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice('Your session has ended. Please sign in again.');
      void clearLocal();
    });
    // e.g. a teacher approved/disabled or their school deactivated while the app is open.
    setAccountStateHandler(() => void refresh().catch(() => {}));
    void restore();
    return () => {
      setUnauthorizedHandler(null);
      setAccountStateHandler(null);
    };
  }, [clearLocal, refresh, restore]);

  // Pick up role/status changes made by an admin when the user comes back to the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && getAuthToken() && Date.now() - lastLoadedAt.current > FOREGROUND_REFRESH_MS) {
        refresh().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [refresh]);

  /** Only keeps the token once the profile has loaded, so a half-finished sign-in never sticks. */
  const startSession = async (token: string) => {
    setNotice(null);
    setAuthToken(token);
    try {
      await loadMe();
    } catch (e) {
      setAuthToken(null);
      throw e;
    }
    await storage.set(TOKEN_KEY, token);
  };

  return (
    <AuthContext
      value={{
        isLoading,
        user,
        children,
        teacher,
        permissions,
        connectionError,
        notice,
        signIn: async (login, password) => startSession((await authApi.login(login, password)).token),
        signUp: async (input) => startSession((await authApi.register(input)).token),
        signOut,
        refresh,
        retry: restore,
      }}>
      {content}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
