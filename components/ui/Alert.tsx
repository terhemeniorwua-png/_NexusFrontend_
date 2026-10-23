import type { AlertVariant } from '@/types/ui';

// ─── Alert ────────────────────────────────────────────────────────────────────

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const alertClasses: Record<AlertVariant, string> = {
  info: 'bg-[var(--color-info-bg)] border-[var(--color-info)] text-[var(--color-info)]',
  success:
    'bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success)]',
  warning:
    'bg-[var(--color-warning-bg)] border-[var(--color-warning)] text-[var(--color-warning)]',
  error:
    'bg-[var(--color-error-bg)] border-[var(--color-error)] text-[var(--color-error)]',
};

/**
 * Alert — page-level or section-level feedback banner.
 * For inline field errors use ErrorMessage instead.
 */
export function Alert({
  variant = 'info',
  title,
  children,
  className = '',
}: AlertProps) {
  return (
    <div
      role="alert"
      className={[
        'rounded-[var(--radius-md)] border px-4 py-3 text-sm',
        alertClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title && (
        <p className="mb-0.5 font-semibold">{title}</p>
      )}
      <div>{children}</div>
    </div>
  );
}

// ─── ErrorMessage ─────────────────────────────────────────────────────────────

interface ErrorMessageProps {
  /** The error text to display */
  message: string | null | undefined;
  /** id attribute — set this to match the aria-describedby on the associated control */
  id?: string;
  className?: string;
}

/**
 * ErrorMessage — inline field-level error for use below form controls.
 * Renders nothing when message is falsy.
 */
export function ErrorMessage({ message, id, className = '' }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={[
        'text-xs text-[var(--color-error)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {message}
    </p>
  );
}
