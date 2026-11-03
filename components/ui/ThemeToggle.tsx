'use client';

import { useTheme, type Theme } from '@/providers/ThemeProvider';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ReactNode;
}

const iconProps = {
  'aria-hidden': true,
  xmlns: 'http://www.w3.org/2000/svg',
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const options: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light theme',
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark theme',
    icon: (
      <svg {...iconProps}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System theme',
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle — segmented light/dark/system control.
 *
 * The preference persists in localStorage and is applied through the token
 * layer, so every component that consumes design tokens adapts automatically.
 */
export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={[
        'inline-flex items-center gap-0.5 rounded-[var(--radius-md)]',
        'border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-0.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={[
              'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
              active
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
