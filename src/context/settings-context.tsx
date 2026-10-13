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

/** The settings that differ from the defaults. */
const diff = (s: Settings) =>
  Object.fromEntries(Object.entries(s).filter(([k, v]) => DEFAULTS[k as keyof Settings] !== v)) as Partial<Settings>;

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storage
      .get(KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          // Changes made before loading finished win over the stored values.
          setSettings((current) => ({ ...DEFAULTS, ...JSON.parse(raw), ...diff(current) }));
        } catch {}
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) storage.set(KEY, JSON.stringify(settings));
  }, [loaded, settings]);

  return (
    <SettingsContext
      value={{
        settings,
        // Functional updates so quick successive changes never overwrite each other.
        update: (patch) => setSettings((current) => ({ ...current, ...patch })),
        reset: () => setSettings(DEFAULTS),
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
