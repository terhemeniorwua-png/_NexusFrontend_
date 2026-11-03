import type { TaskStatus, TaskPriority, AlertVariant } from '@/types/ui';

type BadgeVariant =
  | 'default'
  | AlertVariant
  | TaskStatus
  | TaskPriority
  | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default:
    'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
  outline:
    'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border)]',
  // Alert variants
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]',
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]',
  warning:
    'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]',
  error:
    'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]',
  // Task status variants — always include text, never rely on color alone
  ASSIGNED:
    'bg-[var(--color-status-assigned-bg)] text-[var(--color-status-assigned)] border border-[var(--color-status-assigned)]',
  IN_PROGRESS:
    'bg-[var(--color-status-in-progress-bg)] text-[var(--color-status-in-progress)] border border-[var(--color-status-in-progress)]',
  SUBMITTED:
    'bg-[var(--color-status-submitted-bg)] text-[var(--color-status-submitted)] border border-[var(--color-status-submitted)]',
  UNDER_REVIEW:
    'bg-[var(--color-status-under-review-bg)] text-[var(--color-status-under-review)] border border-[var(--color-status-under-review)]',
  APPROVED:
    'bg-[var(--color-status-approved-bg)] text-[var(--color-status-approved)] border border-[var(--color-status-approved)]',
  CHANGES_REQUESTED:
    'bg-[var(--color-status-changes-bg)] text-[var(--color-status-changes-requested)] border border-[var(--color-status-changes-requested)]',
  // Priority variants
  LOW: 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
  MEDIUM:
    'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]',
  HIGH: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]',
  URGENT:
    'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const classes = variantClasses[variant] ?? variantClasses.default;
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5',
        'text-xs font-medium leading-none',
        classes,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
