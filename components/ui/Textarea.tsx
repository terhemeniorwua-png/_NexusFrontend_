'use client';

import type { LabeledProps } from '@/types/ui';

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>,
    LabeledProps {
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  srOnlyLabel?: boolean;
}

const resizeClasses = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

export function Textarea({
  label,
  id,
  helperText,
  errorMessage,
  required,
  disabled,
  resize = 'vertical',
  srOnlyLabel = false,
  className = '',
  rows = 3,
  ...props
}: TextareaProps) {
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

      <textarea
        id={id}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-required={required}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2',
          'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          resizeClasses[resize],
          errorMessage
            ? 'border-[var(--color-error)] focus-visible:ring-[var(--color-error)]'
            : 'border-[var(--color-border)] focus-visible:ring-[var(--color-primary)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />

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
