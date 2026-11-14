'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToToasts,
  type ToastMessage,
} from '@/lib/toast';

const AUTO_DISMISS_MS: Record<ToastMessage['variant'], number> = {
  info: 6000,
  success: 5000,
  warning: 7000,
  error: 8000,
};

const variantClasses: Record<ToastMessage['variant'], string> = {
  info: 'border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)]',
  success: 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  error: 'border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]',
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  useEffect(() => {
    const timer = window.setTimeout(
      () => dismissToast(toast.id),
      AUTO_DISMISS_MS[toast.variant],
    );
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.variant]);

  return (
    <div
      role="status"
      className={[
        'pointer-events-auto flex items-start justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm shadow-[var(--shadow-md)]',
        variantClasses[toast.variant],
      ].join(' ')}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 shrink-0 rounded p-1 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Renders the shared toast stack. Mount exactly once per application shell. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToToasts, getToasts, getServerToasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[var(--z-toast)] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
