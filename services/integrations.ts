/**
 * services/integrations.ts
 *
 * Integrations management service for Nexus.
 * Routes are mounted at /api/v1/integrations and proxied via /api/backend/integrations.
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntegrationProvider =
  | 'GOOGLE_DRIVE'
  | 'ONEDRIVE'
  | 'DROPBOX'
  | 'GMAIL'
  | 'OUTLOOK'
  | 'SLACK'
  | 'GITHUB'
  | 'GITLAB'
  | 'GOOGLE_CALENDAR'
  | 'OUTLOOK_CALENDAR';

export type IntegrationStatus = 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
export type IntegrationSyncStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface IntegrationSummary {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  enabled?: boolean;
  workspaceId: string | null;
  externalEmail: string | null;
  scopes: string[];
  lastError?: string | null;
  lastRefreshedAt?: string | null;
  lastSyncedAt?: string | null;
  config?: Record<string, unknown> | null;
  createdAt: string;
}

export interface IntegrationSyncJob {
  id: string;
  integrationId: string;
  status: IntegrationSyncStatus;
  attempts?: number;
  maxRetries?: number;
  lastError?: string | null;
  nextAttemptAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface IntegrationStatusResponse {
  integration?: IntegrationSummary;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  syncState?: unknown;
  jobs?: IntegrationSyncJob[];
  [key: string]: unknown;
}

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

function unwrapUrl(data: unknown): string {
  if (data && typeof data === 'object' && 'url' in data && typeof (data as { url: unknown }).url === 'string') {
    return (data as { url: string }).url;
  }
  throw new Error('The server did not return an authorization URL.');
}

// ─── List / Status / Updates ──────────────────────────────────────────────────

export async function listIntegrations(workspaceId?: string): Promise<IntegrationSummary[]> {
  const params = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  const result = await authed<IntegrationSummary[]>(`/integrations${params}`);
  return Array.isArray(result) ? result : [];
}

export async function getIntegrationStatus(integrationId: string): Promise<IntegrationStatusResponse> {
  const result = await authed<IntegrationStatusResponse>(`/integrations/${encodeURIComponent(integrationId)}/status`);
  return result && typeof result === 'object' ? result : {};
}

export async function updateIntegration(
  integrationId: string,
  input: { enabled?: boolean; config?: Record<string, unknown> },
): Promise<IntegrationSummary> {
  return authed<IntegrationSummary>(`/integrations/${encodeURIComponent(integrationId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function queueIntegrationSync(integrationId: string): Promise<IntegrationSyncJob> {
  return authed<IntegrationSyncJob>(`/integrations/${encodeURIComponent(integrationId)}/sync`, {
    method: 'POST',
  });
}

export async function listIntegrationSyncJobs(integrationId: string, limit = 25): Promise<IntegrationSyncJob[]> {
  const q = `?limit=${encodeURIComponent(String(limit))}`;
  const result = await authed<IntegrationSyncJob[]>(`/integrations/${encodeURIComponent(integrationId)}/sync-jobs${q}`);
  return Array.isArray(result) ? result : [];
}

export async function retryIntegrationSyncJob(integrationId: string, jobId: string): Promise<IntegrationSyncJob> {
  return authed<IntegrationSyncJob>(
    `/integrations/${encodeURIComponent(integrationId)}/sync-jobs/${encodeURIComponent(jobId)}/retry`,
    { method: 'POST' },
  );
}

// ─── Connect / Disconnect ─────────────────────────────────────────────────────

export interface ConnectIntegrationInput {
  provider: IntegrationProvider;
  workspaceId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes?: string[];
  externalUserId?: string;
  externalEmail?: string;
}

/** POST /integrations — direct token connect for providers without dedicated OAuth in UI. */
export async function connectIntegration(input: ConnectIntegrationInput): Promise<IntegrationSummary> {
  return authed<IntegrationSummary>('/integrations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  await authed(`/integrations/${encodeURIComponent(integrationId)}`, { method: 'DELETE' });
}

// ─── OAuth Authorize URLs ─────────────────────────────────────────────────────
// Workspace-scoped providers require workspaceId. Callbacks redirect to the frontend integrations page.

export async function getSlackAuthorizeUrl(workspaceId: string): Promise<string> {
  return unwrapUrl(await authed(`/integrations/slack/authorize?workspaceId=${encodeURIComponent(workspaceId)}`));
}

export async function getGoogleDriveAuthorizeUrl(workspaceId: string): Promise<string> {
  return unwrapUrl(await authed(`/integrations/google-drive/authorize?workspaceId=${encodeURIComponent(workspaceId)}`));
}

export async function getDropboxAuthorizeUrl(workspaceId: string): Promise<string> {
  return unwrapUrl(await authed(`/integrations/dropbox/authorize?workspaceId=${encodeURIComponent(workspaceId)}`));
}

export async function getGmailAuthorizeUrl(workspaceId?: string): Promise<string> {
  const params = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return unwrapUrl(await authed(`/integrations/gmail/authorize${params}`));
}

/** Workspace-scoped GitHub integration OAuth (per backend feat/integrations-import). */
export async function getGithubAuthorizeUrl(workspaceId?: string): Promise<string> {
  const params = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return unwrapUrl(await authed(`/integrations/github/authorize${params}`));
}

/** Workspace-scoped Google Calendar integration OAuth. */
export async function getGoogleCalendarAuthorizeUrl(workspaceId?: string): Promise<string> {
  const params = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return unwrapUrl(await authed(`/integrations/google-calendar/authorize${params}`));
}

export async function getOutlookCalendarAuthorizeUrl(): Promise<string> {
  return unwrapUrl(await authed('/integrations/outlook-calendar/authorize'));
}

export async function getOneDriveAuthorizeUrl(): Promise<string> {
  return unwrapUrl(await authed('/integrations/onedrive/authorize'));
}

export async function getOutlookMailAuthorizeUrl(): Promise<string> {
  return unwrapUrl(await authed('/integrations/outlook-mail/authorize'));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export function integrationNeedsReconnect(integration: Pick<IntegrationSummary, 'status' | 'lastError'>): boolean {
  if (integration.status === 'ERROR') return true;
  const err = (integration.lastError ?? '').toLowerCase();
  return /token|auth|invalid|expired|revoked|unauthor/i.test(err);
}

export function getIntegrationConfigString(integration: IntegrationSummary, key: string): string {
  const value = integration.config?.[key];
  return typeof value === 'string' ? value : '';
}
