'use client';

import { useState } from 'react';
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const errorId = errorMessage ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
  const isPassword = type === 'password';

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

      <div className={isPassword ? 'relative' : undefined}>
        <input
          id={id}
          type={isPassword && passwordVisible ? 'text' : type}
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
            isPassword ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-controls={id}
            disabled={disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[var(--radius-md)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed"
          >
            {passwordVisible ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.4 3.3M6.2 6.2C3.9 7.7 2.8 10 2.5 12c.9 2.5 4.5 7 9.5 7 1.2 0 2.3-.3 3.3-.7" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

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
