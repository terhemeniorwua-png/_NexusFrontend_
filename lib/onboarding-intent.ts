import type { AuthAccountType } from '@/types/auth';

const PENDING_ONBOARDING_KEY = 'nexus-pending-onboarding';
const PENDING_ONBOARDING_EVENT = 'nexus-pending-onboarding-change';

export interface PendingOnboardingIntent {
  accountType: AuthAccountType;
  email: string;
}

function notifyPendingIntentChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PENDING_ONBOARDING_EVENT));
}

export function subscribePendingOnboardingIntent(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(PENDING_ONBOARDING_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(PENDING_ONBOARDING_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function isAccountType(value: unknown): value is AuthAccountType {
  return value === 'personal' || value === 'institution' || value === 'business';
}

export function savePendingOnboardingIntent(intent: PendingOnboardingIntent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify({
      accountType: intent.accountType,
      email: intent.email.trim().toLowerCase(),
    }));
    notifyPendingIntentChanged();
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function readPendingOnboardingIntent(email?: string): PendingOnboardingIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(PENDING_ONBOARDING_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return null;
    const value = saved as { accountType?: unknown; email?: unknown };
    if (!isAccountType(value.accountType) || typeof value.email !== 'string') return null;
    if (email && value.email !== email.trim().toLowerCase()) return null;
    return { accountType: value.accountType, email: value.email };
  } catch {
    return null;
  }
}

export function clearPendingOnboardingIntent(email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (email && readPendingOnboardingIntent(email) === null) return;
    window.localStorage.removeItem(PENDING_ONBOARDING_KEY);
    notifyPendingIntentChanged();
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}
