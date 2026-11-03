import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ThemeProvider,
  useTheme,
  THEME_STORAGE_KEY,
} from '@/providers/ThemeProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function ThemeProbe() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <ThemeToggle />
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
}

function mockSystemDark(isDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) =>
      ({
        matches: isDark && query.includes('prefers-color-scheme: dark'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

describe('ThemeProvider and ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockSystemDark(false);
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('defaults to the system preference', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-theme', 'system'),
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
  });

  it('applies and persists an explicit dark preference', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Dark theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(
      screen.getByRole('button', { name: 'Dark theme' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores a stored preference on mount', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderWithProvider();

    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-theme', 'light'),
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('resolves system preference to dark when the OS prefers dark', async () => {
    mockSystemDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');
    renderWithProvider();

    await waitFor(() =>
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark'),
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'system');
  });

  it('can switch back to system', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderWithProvider();

    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark'),
    );
    await user.click(screen.getByRole('button', { name: 'System theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
});
