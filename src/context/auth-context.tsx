import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';

import { setAuthToken, setUnauthorizedHandler } from '@/services/api';
import { authApi, meApi, type AccountType } from '@/services/brightpath';
import { storage } from '@/services/storage';
import type { Child, Permissions, TeacherProfile, User } from '@/types/api';

const TOKEN_KEY = 'brightpath.token';

type AuthContextValue = {
  isLoading: boolean;
  user: User | null;
  /** Connected children (parents only). */
  children: Child[];
  /** Classes and profile (active teachers only). */
  teacher: TeacherProfile | null;
  /** What a school admin may do (school admins only). */
  permissions: Permissions | null;
  /** `login` is an email or a username. */
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (input: {
    displayName: string;
    email: string;
    username: string;
    password: string;
    accountType: AccountType;
    schoolId?: number;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children: content }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setChildren([]);
    setTeacher(null);
    setPermissions(null);
    queryClient.clear();
    await storage.remove(TOKEN_KEY);
  }, [queryClient]);

  const loadMe = useCallback(async () => {
    const me = await meApi.get();
    setUser(me.user);
    setChildren(me.children);
    setTeacher(me.teacher);
    setPermissions(me.permissions);
  }, []);

  const startSession = async (token: string) => {
    setAuthToken(token);
    await storage.set(TOKEN_KEY, token);
    await loadMe();
  };

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    (async () => {
      try {
        const token = await storage.get(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          await loadMe();
        }
      } catch {
        await signOut();
      } finally {
        setIsLoading(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [loadMe, signOut]);

  return (
    <AuthContext
      value={{
        isLoading,
        user,
        children,
        teacher,
        permissions,
        signIn: async (login, password) => startSession((await authApi.login(login, password)).token),
        signUp: async (input) => startSession((await authApi.register(input)).token),
        signOut,
        refresh: loadMe,
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
