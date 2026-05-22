/**
 * ThemeContext.tsx
 * Ported from Next.js contexts/ThemeContext.tsx
 * Manages light / dark / system modes with localStorage persistence.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSettings {
  mode: ThemeMode;
}

export interface ThemeContextType {
  /** Current resolved theme ('light' | 'dark') after system preference applied */
  theme: 'light' | 'dark';
  /** Full settings object */
  settings: ThemeSettings;
  /** Update individual settings fields */
  updateSettings: (patch: Partial<ThemeSettings>) => void;
  /** Cycles: light → dark → system → light */
  toggleMode: () => void;
  /** Alias for quick boolean check */
  isDark: boolean;
  /** Reset to default (system) */
  resetToDefault: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'themeSettings';
const DEFAULT_SETTINGS: ThemeSettings = { mode: 'dark' };

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function loadSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
      if (parsed.mode && ['light', 'dark', 'system'].includes(parsed.mode)) {
        return { mode: parsed.mode };
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    applyTheme(resolveTheme(saved.mode));
    setMounted(true);
  }, []);

  // Listen for system preference changes when mode === 'system'
  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (settings.mode === 'system') {
        applyTheme(resolveTheme('system'));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.mode, mounted]);

  // Apply theme + persist whenever settings change (after mount)
  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolveTheme(settings.mode));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, mounted]);

  const updateSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const toggleMode = useCallback(() => {
    setSettings(prev => {
      const next: ThemeMode =
        prev.mode === 'light' ? 'dark' :
        prev.mode === 'dark'  ? 'system' : 'light';
      return { ...prev, mode: next };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Prevent flash before hydration
  if (!mounted) return <>{children}</>;

  const theme = resolveTheme(settings.mode);

  return (
    <ThemeContext.Provider value={{
      theme,
      settings,
      updateSettings,
      toggleMode,
      isDark: theme === 'dark',
      resetToDefault,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
