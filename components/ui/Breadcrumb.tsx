import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  /** If provided, renders as a link. Omit for the current (last) item. */
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb — accessible navigation landmark.
 * The last item is treated as the current page and rendered as plain text.
 * All preceding items are rendered as links.
 */
export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={['flex items-center', className].filter(Boolean).join(' ')}
    >
      <ol className="flex items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {/* Separator — hidden from screen readers */}
              {index > 0 && (
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-[var(--color-text-secondary)] flex-shrink-0"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}

              {isLast ? (
                // Current page — not a link
                <span
                  aria-current="page"
                  className="font-medium text-[var(--color-text-primary)] truncate max-w-[180px]"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href ?? '#'}
                  className={[
                    'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors',
                    'truncate max-w-[140px]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-sm',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
