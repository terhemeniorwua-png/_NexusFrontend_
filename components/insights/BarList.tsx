interface BarListItem {
  id: string;
  label: string;
  value: number;
}

interface BarListProps {
  /** Accessible label for the chart group. */
  ariaLabel: string;
  items: BarListItem[];
  /** Message shown when every value is zero. */
  emptyLabel?: string;
  className?: string;
}

/**
 * BarList — lightweight, dependency-free horizontal bar chart.
 *
 * Values are rendered as text next to each bar, so the data is readable by
 * assistive technology and does not depend on colour or bar length. Bars are
 * decorative and hidden from the accessibility tree.
 */
export function BarList({
  ariaLabel,
  items,
  emptyLabel = 'No data in this range.',
  className = '',
}: BarListProps) {
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={className}>
      {total === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5" aria-label={ariaLabel}>
          {items.map((item) => {
            const percent = max > 0 ? Math.round((item.value / max) * 100) : 0;
            return (
              <li key={item.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[var(--color-text-secondary)]">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-[var(--color-text-primary)]">
                    {item.value}
                  </span>
                </div>
                <div
                  className="mt-1 h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-secondary)]"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-[var(--radius-full)] bg-[var(--color-primary)] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
