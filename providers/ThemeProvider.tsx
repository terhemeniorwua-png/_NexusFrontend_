'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** localStorage key used by the pre-paint theme script in app/layout.tsx. */
export const THEME_STORAGE_KEY = 'nexus-theme';

interface ThemeContextValue {
  /** The user's stored preference, including "system". */
  theme: Theme;
  /** The theme actually applied after resolving "system". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

// ─── Theme preference store ──────────────────────────────────────────────────

const themeListeners = new Set<() => void>();

function readTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

function emitThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function subscribeToTheme(callback: () => void): () => void {
  themeListeners.add(callback);

  if (typeof window === 'undefined') {
    return () => themeListeners.delete(callback);
  }

  // Keep other tabs in sync with the stored preference.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    themeListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

// ─── System preference store ─────────────────────────────────────────────────

function readSystemTheme(): ResolvedTheme {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function subscribeToSystemTheme(callback: () => void): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Used when no stored preference exists. */
  defaultTheme?: Theme;
}

/**
 * ThemeProvider — owns the light/dark/system preference.
 *
 * The theme is applied by setting `data-theme` on <html>, which drives the
 * token overrides in app/globals.css. An inline script in the root layout
 * applies the stored value before first paint to avoid a flash of the wrong
 * theme. This provider keeps React state and storage in sync with it.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const getTheme = useCallback(() => readTheme(defaultTheme), [defaultTheme]);

  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    () => defaultTheme,
  );
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    readSystemTheme,
    () => 'light' as const,
  );

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? systemTheme : theme;

  // Keep the document attribute in sync with the active preference. This is a
  // DOM write, not React state, so it does not cause cascading renders.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort; the preference still applies this session.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    emitThemeChange();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Access the active theme. Must be used inside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return context;
}
