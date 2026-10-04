import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import { storage } from '@/services/storage';
import type { Child } from '@/types/api';

const KEY = 'brightpath.selectedChild';

type ChildContextValue = {
  child: Child | null;
  selectChild: (id: number) => void;
};

const ChildContext = createContext<ChildContextValue | null>(null);

/** Tracks which connected child the parent is currently viewing. */
export function ChildProvider({ children: content }: PropsWithChildren) {
  const { children } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    storage.get(KEY).then((v) => v && setSelectedId(Number(v)));
  }, []);

  const child = children.find((c) => c.id === selectedId) ?? children[0] ?? null;

  return (
    <ChildContext
      value={{
        child,
        selectChild: (id) => {
          setSelectedId(id);
          storage.set(KEY, String(id));
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
