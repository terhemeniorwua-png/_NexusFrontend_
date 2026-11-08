/**
 * services/integrations.ts
 *
 * Integrations management service for the Nexus platform.
 *
 * Route: GET/POST/DELETE /api/v1/integrations
 * Forwarded via: /api/backend/integrations
 *
 * ─── Verified backend contract (2026-11-08) ─────────────────────────────────
 *
 * GET    /integrations           list — IntegrationSummary[]
 *   query: workspaceId? (UUID)
 *
 * POST   /integrations           connect — IntegrationSummary (201)
 *   body: { provider, workspaceId?, accessToken, refreshToken?,
 *           tokenExpiresAt?, scopes?, externalUserId?, externalEmail? }
 *   NOTE: SLACK, GOOGLE_DRIVE and DROPBOX must go through their OAuth flows
 *         (/integrations/slack|google-drive|dropbox/authorize)
 *
 * DELETE /integrations/:integrationId   disconnect — {ok: true}
 *
 * GET    /integrations/slack/authorize   get Slack OAuth URL
 *   query: workspaceId (UUID)
 *   response: { url: string }
 *
 * Providers: GOOGLE_DRIVE | ONEDRIVE | DROPBOX | GMAIL | OUTLOOK |
 *            SLACK | GITHUB | GITLAB | GOOGLE_CALENDAR | OUTLOOK_CALENDAR
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntegrationProvider =
  | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX'
  | 'GMAIL' | 'OUTLOOK'
  | 'SLACK'
  | 'GITHUB' | 'GITLAB'
  | 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR';

export type IntegrationStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';

export interface IntegrationSummary {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  workspaceId: string | null;
  externalEmail: string | null;
  scopes: string[];
  createdAt: string;
}

export interface ConnectIntegrationInput {
  provider: IntegrationProvider;
  workspaceId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  externalUserId?: string | null;
  externalEmail?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── API functions ────────────────────────────────────────────────────────────

/** List connected integrations for the current user, optionally scoped to a workspace. */
export async function listIntegrations(workspaceId?: string): Promise<IntegrationSummary[]> {
  const q = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return authed<IntegrationSummary[]>(`/integrations${q}`);
}

/** Disconnect an integration by ID. */
export async function disconnectIntegration(integrationId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`/integrations/${integrationId}`, { method: 'DELETE' });
}

/** Get the Slack OAuth authorization URL (workspace-level, manager required). */
export async function getSlackAuthorizeUrl(workspaceId: string): Promise<{ url: string }> {
  return authed<{ url: string }>(
    `/integrations/slack/authorize?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

/** Get the Google Drive OAuth authorization URL (workspace-level, manager required). */
export async function getGoogleDriveAuthorizeUrl(workspaceId: string): Promise<{ url: string }> {
  return authed<{ url: string }>(
    `/integrations/google-drive/authorize?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}

/** Get the Dropbox OAuth authorization URL (workspace-level, manager required). */
export async function getDropboxAuthorizeUrl(workspaceId: string): Promise<{ url: string }> {
  return authed<{ url: string }>(
    `/integrations/dropbox/authorize?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
}
