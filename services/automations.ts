/**
 * services/automations.ts
 *
 * Automation and Workflow service for the PITERON platform.
 *
 * Routes at /api/v1/workspaces/:workspaceId/automations
 * Forwarded via /api/backend/workspaces/:workspaceId/automations
 *
 * Real backend contract (automation engine + queue, 2026-11-17):
 * - GET    /workspaces/:wsId/automations                 list — Automation[]
 * - POST   /workspaces/:wsId/automations                 create — Automation (201)
 * - GET    /workspaces/:wsId/automations/:id             get — Automation (with recent runs)
 * - GET    /workspaces/:wsId/automations/:id/runs        run history — AutomationRun[]
 * - POST   /workspaces/:wsId/automations/:id/runs/:runId/retry retry failed run — AutomationRun
 * - PATCH  /workspaces/:wsId/automations/:id             update name/enabled — Automation
 * - DELETE /workspaces/:wsId/automations/:id             soft-delete — { ok: true }
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationTrigger =
  | 'EVENT_TASK_CREATED'
  | 'EVENT_TASK_COMPLETED'
  | 'EVENT_MEMBER_JOINED'
  | 'EVENT_TASK_STATUS_CHANGED'
  | 'EVENT_TASK_ASSIGNED'
  | 'EVENT_TASK_DUE_DATE_PASSED'
  | 'EVENT_FORM_SUBMITTED'
  | 'SCHEDULED_DAILY'
  | 'SCHEDULED_WEEKLY';

export type AutomationAction =
  | 'SEND_NOTIFICATION'
  | 'CREATE_TASK'
  | 'SEND_WEBHOOK'
  | 'SET_FIELD'
  | 'ASSIGN'
  | 'POST_MESSAGE';

export type AutomationRunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

export interface AutomationRun {
  id: string;
  automationId: string;
  status: AutomationRunStatus;
  attempts: number;
  error: string | null;
  eventKey?: string | null;
  payload?: Record<string, unknown> | null;
  nextAttemptAt?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Automation {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  trigger: AutomationTrigger | string;
  condition: Record<string, string> | null;
  action: AutomationAction | string;
  actionConfig: Record<string, string>;
  enabled: boolean;
  maxRetries: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  runs?: AutomationRun[];
}

export interface CreateAutomationInput {
  name: string;
  trigger: AutomationTrigger | string;
  action: AutomationAction | string;
  actionConfig: Record<string, string>;
  condition?: Record<string, string> | null;
  enabled?: boolean;
  maxRetries?: number;
}

export interface UpdateAutomationInput {
  name?: string;
  enabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base(workspaceId: string): string {
  return `/workspaces/${workspaceId}/automations`;
}

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function listAutomations(workspaceId: string): Promise<Automation[]> {
  return authed<Automation[]>(base(workspaceId));
}

export async function getAutomation(workspaceId: string, automationId: string): Promise<Automation> {
  return authed<Automation>(`${base(workspaceId)}/${automationId}`);
}

export async function listAutomationRuns(
  workspaceId: string,
  automationId: string,
  options: { limit?: number } = {},
): Promise<AutomationRun[]> {
  const params = new URLSearchParams();
  if (options.limit != null) params.set('limit', String(options.limit));
  const qs = params.toString();
  return authed<AutomationRun[]>(`${base(workspaceId)}/${automationId}/runs${qs ? `?${qs}` : ''}`);
}

export async function retryAutomationRun(
  workspaceId: string,
  automationId: string,
  runId: string,
): Promise<AutomationRun> {
  return authed<AutomationRun>(`${base(workspaceId)}/${automationId}/runs/${runId}/retry`, {
    method: 'POST',
  });
}

export async function createAutomation(
  workspaceId: string,
  input: CreateAutomationInput,
): Promise<Automation> {
  return authed<Automation>(base(workspaceId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function updateAutomation(
  workspaceId: string,
  automationId: string,
  input: UpdateAutomationInput,
): Promise<Automation> {
  return authed<Automation>(`${base(workspaceId)}/${automationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteAutomation(workspaceId: string, automationId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${automationId}`, { method: 'DELETE' });
}
