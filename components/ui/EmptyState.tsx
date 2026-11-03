interface EmptyStateProps {
  /** SVG icon element or emoji */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action button or link */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={[
        'flex flex-col items-center justify-center gap-3 py-12 px-4 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="text-[var(--color-text-secondary)] [&>svg]:h-10 [&>svg]:w-10"
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
