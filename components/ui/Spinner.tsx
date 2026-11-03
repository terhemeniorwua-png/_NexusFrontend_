import type { ComponentSize } from '@/types/ui';

interface SpinnerProps {
  size?: ComponentSize;
  /** Accessible label for screen readers */
  label?: string;
  className?: string;
}

const sizeClasses: Record<ComponentSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

export function Spinner({
  size = 'md',
  label = 'Loading…',
  className = '',
}: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <span
        aria-hidden="true"
        className={[
          'animate-spin rounded-full',
          'border-[var(--color-border)] border-t-[var(--color-primary)]',
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </span>
  );
}
