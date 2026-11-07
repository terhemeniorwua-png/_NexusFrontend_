import type { AuthAccountType } from '@/types/auth';
import { safeRedirectPath } from '@/lib/redirect';

const GOOGLE_OAUTH_INTENT_KEY = 'nexus-google-oauth-intent';

export interface GoogleOAuthIntent {
  mode: 'sign-in' | 'sign-up';
  accountType?: AuthAccountType;
  redirectPath?: string;
}

function isAccountType(value: unknown): value is AuthAccountType {
  return value === 'personal' || value === 'institution' || value === 'business';
}

export function beginGoogleOAuth(
  intent: GoogleOAuthIntent,
  navigate: (path: string) => void,
): void {
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, JSON.stringify({
        mode: intent.mode,
        ...(intent.accountType ? { accountType: intent.accountType } : {}),
        ...(safeRedirectPath(intent.redirectPath) ? { redirectPath: safeRedirectPath(intent.redirectPath) } : {}),
      }));
    } catch {
      // Authentication can continue if browser session storage is unavailable.
    }
  }
  navigate('/api/backend/auth/google');
}

export function readGoogleOAuthIntent(): GoogleOAuthIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(GOOGLE_OAUTH_INTENT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const intent = value as { mode?: unknown; accountType?: unknown; redirectPath?: unknown };
    if (intent.mode !== 'sign-in' && intent.mode !== 'sign-up') return null;
    return {
      mode: intent.mode,
      ...(isAccountType(intent.accountType) ? { accountType: intent.accountType } : {}),
      ...(typeof intent.redirectPath === 'string' && safeRedirectPath(intent.redirectPath)
        ? { redirectPath: safeRedirectPath(intent.redirectPath) ?? undefined }
        : {}),
    };
  } catch {
    return null;
  }
}

export function clearGoogleOAuthIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(GOOGLE_OAUTH_INTENT_KEY);
  } catch {
    // Clearing session storage is best-effort in restricted browser contexts.
  }
}

export function saveGoogleOAuthIntent(intent: GoogleOAuthIntent): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(GOOGLE_OAUTH_INTENT_KEY, JSON.stringify({
      mode: intent.mode,
      ...(intent.accountType ? { accountType: intent.accountType } : {}),
      ...(safeRedirectPath(intent.redirectPath) ? { redirectPath: safeRedirectPath(intent.redirectPath) } : {}),
    }));
  } catch {
    // Authentication can continue if browser session storage is unavailable.
  }
}
