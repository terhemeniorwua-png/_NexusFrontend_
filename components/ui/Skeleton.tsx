interface SkeletonProps {
  /** Width — any valid CSS value or Tailwind width class */
  className?: string;
  /** Height — any valid CSS value or Tailwind height class */
  height?: string;
  /** Whether to render as a circle (for avatar skeletons) */
  circle?: boolean;
}

/**
 * Skeleton loading placeholder. Matches the shape of the content it replaces.
 * Wrap multiple Skeletons in a container with aria-label="Loading" aria-busy="true".
 */
export function Skeleton({ className = '', height, circle = false }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        'block animate-pulse bg-[var(--color-surface-secondary)]',
        circle ? 'rounded-full' : 'rounded-[var(--radius-md)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={height ? { height } : undefined}
    />
  );
}

/** Pre-built skeleton for a single text line */
export function SkeletonText({ className = '' }: { className?: string }) {
  return <Skeleton className={['h-4 w-full', className].filter(Boolean).join(' ')} />;
}

/** Pre-built skeleton for a card with a title + 2 lines of text */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={[
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4',
        'flex flex-col gap-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
