'use client';

import type { LabeledProps, ComponentSize } from '@/types/ui';

type InputType = 'text' | 'email' | 'password' | 'search' | 'url' | 'tel' | 'number';

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'id'>,
    LabeledProps {
  type?: InputType;
  size?: ComponentSize;
  /** Hides the visible label visually but keeps it accessible */
  srOnlyLabel?: boolean;
}

const sizeClasses: Record<ComponentSize, string> = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-9 px-3 text-sm',
  lg: 'h-11 px-4 text-base',
};

export function Input({
  label,
  id,
  type = 'text',
  size = 'md',
  helperText,
  errorMessage,
  required,
  disabled,
  srOnlyLabel = false,
  className = '',
  ...props
}: InputProps) {
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

      <input
        id={id}
        type={type}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-secondary)]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          errorMessage
            ? 'border-[var(--color-error)] focus-visible:ring-[var(--color-error)]'
            : 'border-[var(--color-border)]',
          sizeClasses[size],
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
