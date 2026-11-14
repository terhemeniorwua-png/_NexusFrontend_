/**
 * lib/toast.ts
 *
 * Minimal application toast store. Toast state is UI-only feedback; it never
 * stores server data and is not persisted. Mount <Toaster /> once in the
 * authenticated shell so any module (including lib/api.ts) can surface a
 * friendly message.
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
}

type Listener = () => void;

let nextId = 1;
let toasts: ToastMessage[] = [];
const listeners = new Set<Listener>();
const EMPTY: ToastMessage[] = [];

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function showToast(input: string | ToastInput): number {
  const { message, variant = 'info' } =
    typeof input === 'string' ? { message: input, variant: 'info' as const } : input;
  if (!message) return 0;
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  return id;
}

export function dismissToast(id: number): void {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastMessage[] {
  return toasts;
}

/** Stable server snapshot for useSyncExternalStore. */
export function getServerToasts(): ToastMessage[] {
  return EMPTY;
}

/** Test helper: clear all queued toasts without touching mounted listeners. */
export function clearToasts(): void {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
}
