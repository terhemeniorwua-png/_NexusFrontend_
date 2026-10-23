'use client';

import type { LabeledProps, ComponentSize } from '@/types/ui';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'id'>,
    LabeledProps {
  options: SelectOption[];
  size?: ComponentSize;
  placeholder?: string;
  srOnlyLabel?: boolean;
}

const sizeClasses: Record<ComponentSize, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-9 px-3 text-sm',
  lg: 'h-11 px-4 text-base',
};

export function Select({
  label,
  id,
  options,
  size = 'md',
  placeholder,
  helperText,
  errorMessage,
  required,
  disabled,
  srOnlyLabel = false,
  className = '',
  ...props
}: SelectProps) {
  const errorId = errorMessage ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className={[
          'text-sm font-medium text-[var(--color-text-primary)]',
          srOnlyLabel ? 'sr-only' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[var(--color-error)]">
            *
          </span>
        )}
      </label>

      <select
        id={id}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--color-surface)]',
          'text-[var(--color-text-primary)] pr-8',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748B\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.5rem_center]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          errorMessage
            ? 'border-[var(--color-error)] focus-visible:ring-[var(--color-error)]'
            : 'border-[var(--color-border)] focus-visible:ring-[var(--color-primary)]',
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {errorMessage && (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-error)]">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p id={helperId} className="text-xs text-[var(--color-text-secondary)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
