'use client';

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  /** Group legend — accessible name for the group */
  legend: string;
  /** Unique name attribute shared by all radio inputs in the group */
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  errorMessage?: string;
  helperText?: string;
  /** Hides the legend visually while keeping it accessible */
  srOnlyLegend?: boolean;
  className?: string;
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  errorMessage,
  helperText,
  srOnlyLegend = false,
  className = '',
}: RadioGroupProps) {
  const errorId = errorMessage ? `${name}-error` : undefined;
  const helperId = helperText ? `${name}-helper` : undefined;

  return (
    <fieldset
      className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}
      aria-describedby={
        [errorId, helperId].filter(Boolean).join(' ') || undefined
      }
    >
      <legend
        className={[
          'mb-1 text-sm font-medium text-[var(--color-text-primary)]',
          srOnlyLegend ? 'sr-only' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {legend}
      </legend>

      {options.map((option) => (
        <label
          key={option.value}
          className={[
            'flex items-center gap-2 text-sm text-[var(--color-text-primary)]',
            option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            disabled={option.disabled}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            className={[
              'h-4 w-4 border-[var(--color-border)] accent-[var(--color-primary)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1',
              errorMessage ? 'border-[var(--color-error)]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          {option.label}
        </label>
      ))}

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
    </fieldset>
  );
}
