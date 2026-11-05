/**
 * icons.tsx
 *
 * Small inline SVG icons owned by the application shell.
 *
 * No icon library is installed, so inline SVG remains the project convention.
 * Icons are decorative: every control that uses one supplies its own
 * accessible name.
 */

interface IconProps {
  className?: string;
  size?: number;
}

const baseProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function MenuIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function SearchIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function BellIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function MessageIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-5.2a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
    </svg>
  );
}

export function ChecksIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="m4 12 4 4L20 4" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
