interface PageHeaderProps {
  /** Page title rendered as the single h1 for the page */
  title: string;
  /** Short supporting description below the title */
  description?: string;
  /** Breadcrumb, back link, or context element above the title */
  breadcrumb?: React.ReactNode;
  /** Primary and secondary page actions */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — consistent page title block.
 *
 * Renders one h1 per page, an optional breadcrumb slot, an optional
 * description, and an actions slot. Wrap the page in PageContainer to keep
 * width and padding consistent with the rest of the application.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}
    >
      {breadcrumb && <div>{breadcrumb}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
