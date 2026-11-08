/**
 * lib/invitation-intent.ts
 *
 * Preserves the invitation token and its public context across authentication
 * redirects so the confirmation dialog can be shown immediately after sign-in
 * or account creation, without a second round-trip for the preview.
 *
 * sessionStorage is used (not localStorage) because:
 *   - The intent must not survive across browser sessions.
 *   - It is already cleared when the tab is closed.
 *   - Invitation tokens are single-use secrets; short lifetime is appropriate.
 *
 * This module is browser-only. Every exported function is a no-op on the
 * server and never throws.
 */

const INVITATION_INTENT_KEY = 'nexus-invitation-intent';
const INVITATION_INTENT_EVENT = 'nexus-invitation-intent-change';

export interface InvitationIntent {
  /** The raw invitation token from the URL. */
  token: string;
  /** Workspace the invitation is for. */
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  /** Who sent the invitation. */
  invitedByName: string;
  /** Masked email address shown in the preview (e.g. a***@example.com). */
  maskedEmail: string;
  /** Whether the invitation is bound to a specific existing account. */
  boundToAccount: boolean;
  /** ISO 8601 expiry timestamp. */
  expiresAt: string;
  /** Workspace role granted by the invitation (e.g. 'MEMBER'). */
  role: string;
  /** Organization role granted, or null for personal workspaces. */
  organizationRole: string | null;
}

function notifyIntentChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INVITATION_INTENT_EVENT));
  }
}

/** Subscribe to intent changes — for use with useSyncExternalStore. */
export function subscribeInvitationIntent(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(INVITATION_INTENT_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(INVITATION_INTENT_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** Persist the invitation intent for the duration of the auth redirect. */
export function saveInvitationIntent(intent: InvitationIntent): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(INVITATION_INTENT_KEY, JSON.stringify(intent));
    notifyIntentChanged();
  } catch {
    // sessionStorage may be unavailable in restricted browser contexts.
  }
}

/** Read the saved invitation intent. Returns null if none is saved or malformed. */
export function readInvitationIntent(): InvitationIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(INVITATION_INTENT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Record<string, unknown>;
    if (
      typeof value.token !== 'string' ||
      typeof value.workspaceId !== 'string' ||
      typeof value.workspaceName !== 'string' ||
      typeof value.workspaceSlug !== 'string' ||
      typeof value.invitedByName !== 'string' ||
      typeof value.maskedEmail !== 'string' ||
      typeof value.expiresAt !== 'string'
    ) {
      return null;
    }
    return {
      token: value.token,
      workspaceId: value.workspaceId,
      workspaceName: value.workspaceName,
      workspaceSlug: value.workspaceSlug,
      invitedByName: value.invitedByName,
      maskedEmail: value.maskedEmail,
      boundToAccount: Boolean(value.boundToAccount),
      expiresAt: value.expiresAt,
      role: typeof value.role === 'string' ? value.role : 'MEMBER',
      organizationRole: typeof value.organizationRole === 'string' ? value.organizationRole : null,
    };
  } catch {
    return null;
  }
}

/** Remove the saved invitation intent. */
export function clearInvitationIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(INVITATION_INTENT_KEY);
    notifyIntentChanged();
  } catch {
    // sessionStorage may be unavailable in restricted browser contexts.
  }
}

/**
 * Extracts an invitation token from an invitation accept redirect path such as
 * `/workspaces/invitations/accept?token=abc123`.
 * Returns null if the path does not match or has no token.
 */
export function extractTokenFromRedirectPath(redirectPath: string | null | undefined): string | null {
  if (!redirectPath) return null;
  try {
    // The redirect path is a relative URL, so parse it against a dummy origin.
    const url = new URL(redirectPath, 'https://x');
    if (!url.pathname.endsWith('/workspaces/invitations/accept')) return null;
    const token = url.searchParams.get('token');
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}
