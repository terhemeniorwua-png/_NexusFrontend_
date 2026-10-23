'use client';

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  /** Visible label text — required for accessibility */
  label: string;
  id: string;
  /** Error message associated with this checkbox */
  errorMessage?: string;
  /** Helper text shown below the checkbox */
  helperText?: string;
}

export function Checkbox({
  label,
  id,
  errorMessage,
  helperText,
  disabled,
  className = '',
  ...props
}: CheckboxProps) {
  const errorId = errorMessage ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className={[
          'flex items-center gap-2 text-sm text-[var(--color-text-primary)]',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          type="checkbox"
          id={id}
          disabled={disabled}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1',
            errorMessage ? 'border-[var(--color-error)]' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {label}
      </label>

      {errorMessage && (
        <p id={errorId} role="alert" className="ml-6 text-xs text-[var(--color-error)]">
          {errorMessage}
        </p>
      )}
      {helperText && !errorMessage && (
        <p id={helperId} className="ml-6 text-xs text-[var(--color-text-secondary)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
