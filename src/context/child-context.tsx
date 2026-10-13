import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import { storage } from '@/services/storage';
import type { Child } from '@/types/api';

// Remembered per account, so a different parent signing in on the same device starts fresh.
const keyFor = (userId: number) => `brightpath.selectedChild.${userId}`;

type ChildContextValue = {
  child: Child | null;
  selectChild: (id: number) => void;
};

const ChildContext = createContext<ChildContextValue | null>(null);

/** Tracks which connected child the parent is currently viewing. */
export function ChildProvider({ children: content }: PropsWithChildren) {
  const { user, children } = useAuth();
  const userId = user?.id;
  const [selected, setSelected] = useState<{ userId: number; childId: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    storage.get(keyFor(userId)).then((v) => {
      if (!cancelled && v) setSelected({ userId, childId: Number(v) });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Ignore a selection made by another account; fall back to the first connected child.
  const selectedId = selected && selected.userId === userId ? selected.childId : null;
  const child = children.find((c) => c.id === selectedId) ?? children[0] ?? null;

  return (
    <ChildContext
      value={{
        child,
        selectChild: (id) => {
          if (!userId) return;
          setSelected({ userId, childId: id });
          storage.set(keyFor(userId), String(id));
        },
      }}>
      {content}
    </ChildContext>
  );
}

export function useChild() {
  const ctx = use(ChildContext);
  if (!ctx) throw new Error('useChild must be used inside ChildProvider');
  return ctx;
}

/** For screens that only render when a child is connected. */
export function useChildId() {
  const { child } = useChild();
  return child?.id ?? 0;
}
