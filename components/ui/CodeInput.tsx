'use client';

import { useId, useRef } from 'react';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  errorMessage?: string;
  label?: string;
  id?: string;
  autoFocus?: boolean;
  className?: string;
}

const CODE_LENGTH = 6;

export function CodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  errorMessage,
  label = 'Verification code',
  id,
  autoFocus = true,
  className = '',
}: CodeInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function emitNext(nextValue: string) {
    const normalized = nextValue.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange(normalized);
    if (normalized.length === CODE_LENGTH && onComplete) {
      onComplete(normalized);
    }
  }

  function handleChange(index: number, nextChar: string) {
    if (disabled) return;
    const sanitized = nextChar.replace(/\D/g, '').slice(0, 1);
    const nextValue = value.substring(0, index) + sanitized + value.substring(index + 1);
    emitNext(nextValue);

    if (sanitized && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
      return;
    }
    if (event.key === 'Backspace') {
      const nextValue = value.slice(0, index) + value.slice(index + 1);
      emitNext(nextValue);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
      return;
    }
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    if (disabled) return;
    const pasted = event.clipboardData.getData('text') ?? '';
    const sanitized = pasted.replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!sanitized) return;
    event.preventDefault();
    const nextValue = sanitized;
    emitNext(nextValue);
    const lastIndex = Math.min(sanitized.length, CODE_LENGTH) - 1;
    if (lastIndex >= 0) refs.current[lastIndex]?.focus();
  }

  return (
    <div className={className}>
      <label htmlFor={`${inputId}-0`} className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      <div className="flex items-center gap-2" aria-label={label}>
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <input
            key={index}
            id={index === 0 ? `${inputId}-0` : undefined}
            ref={(element) => { refs.current[index] = element; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            pattern="[0-9]*"
            aria-label={`${label} ${index + 1}`}
            value={value[index] ?? ''}
            disabled={disabled}
            onFocus={(event) => event.target.select()}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={[
              'h-12 w-10 rounded-[var(--radius-md)] border text-center text-base font-semibold text-[var(--color-text-primary)]',
              'bg-[var(--color-surface)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0',
              errorMessage ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]',
              disabled ? 'cursor-not-allowed opacity-60' : '',
            ].filter(Boolean).join(' ')}
            autoFocus={autoFocus && index === 0}
          />
        ))}
      </div>
      {errorMessage && (
        <p aria-live="polite" role="alert" className="mt-2 text-xs text-[var(--color-error)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
