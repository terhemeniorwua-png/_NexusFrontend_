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

export function HomeIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="m3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function Building2Icon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M14 2v6l-2-3-2 3V2h6z" />
      <path d="M22 18v-2a3 3 0 0 0-3-3h-9a3 3 0 0 0-3-3H3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3z" />
    </svg>
  );
}

export function FolderKanbanIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M10 15h3a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1z" />
      <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

export function MessageSquareIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.4 8.4 0 0 1 8 8.4z" />
    </svg>
  );
}

export function CalendarDaysIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M12 2v4" />
      <path d="M4 22h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
    </svg>
  );
}

export function FilesIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

export function BlocksIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function SearchIcon2({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m19 19-3-3" />
    </svg>
  );
}

export function SettingsIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.82-.33l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1z" />
    </svg>
  );
}

export function ListIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export function ClockIcon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function CheckCircle2Icon({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...baseProps} width={size} height={size} className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
