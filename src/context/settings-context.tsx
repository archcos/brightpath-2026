import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { storage } from '@/services/storage';

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  textSize: 'small' | 'default' | 'large';
  highContrast: boolean;
  reduceMotion: boolean;
};

const DEFAULTS: Settings = { theme: 'system', textSize: 'default', highContrast: false, reduceMotion: false };
const KEY = 'brightpath.settings';

export const TEXT_SCALE: Record<Settings['textSize'], number> = { small: 0.9, default: 1, large: 1.15 };

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    storage.get(KEY).then((raw) => {
      if (!raw) return;
      try {
        setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {}
    });
  }, []);

  const persist = (next: Settings) => {
    setSettings(next);
    storage.set(KEY, JSON.stringify(next));
  };

  return (
    <SettingsContext
      value={{
        settings,
        update: (patch) => persist({ ...settings, ...patch }),
        reset: () => persist(DEFAULTS),
      }}>
      {children}
    </SettingsContext>
  );
}

export function useSettings() {
  const ctx = use(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
