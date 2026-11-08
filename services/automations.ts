/**
 * services/automations.ts
 *
 * Automation and Workflow service for the Nexus platform.
 *
 * All routes at /api/v1/workspaces/:workspaceId/automations
 * Forwarded via /api/backend/workspaces/:workspaceId/automations
 *
 * ─── Verified backend contract (2026-11-08) ─────────────────────────────────
 *
 * GET    /workspaces/:wsId/automations           list — Automation[]
 *
 * POST   /workspaces/:wsId/automations           create — Automation (201)
 *   body: { name, trigger, action, actionConfig, condition?, enabled?, maxRetries? }
 *
 * GET    /workspaces/:wsId/automations/:autoId   get single — Automation (with last 10 runs)
 *
 * PATCH  /workspaces/:wsId/automations/:autoId   update — Automation
 *   body: { name?, enabled? }
 *
 * DELETE /workspaces/:wsId/automations/:autoId   soft-delete — {ok: true}
 *
 * Triggers:  EVENT_TASK_CREATED | EVENT_TASK_COMPLETED |
 *            EVENT_MEMBER_JOINED | SCHEDULED_DAILY | SCHEDULED_WEEKLY
 *
 * Actions:   SEND_NOTIFICATION | CREATE_TASK | SEND_WEBHOOK
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationTrigger =
  | 'EVENT_TASK_CREATED'
  | 'EVENT_TASK_COMPLETED'
  | 'EVENT_MEMBER_JOINED'
  | 'SCHEDULED_DAILY'
  | 'SCHEDULED_WEEKLY';

export type AutomationAction = 'SEND_NOTIFICATION' | 'CREATE_TASK' | 'SEND_WEBHOOK';

export type AutomationRunStatus = 'SUCCEEDED' | 'FAILED' | 'SKIPPED';

export interface AutomationRun {
  id: string;
  automationId: string;
  status: AutomationRunStatus;
  attempts: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface Automation {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  trigger: AutomationTrigger;
  condition: Record<string, string> | null;
  action: AutomationAction;
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
  trigger: AutomationTrigger;
  action: AutomationAction;
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

/** List automations for a workspace. */
export async function listAutomations(workspaceId: string): Promise<Automation[]> {
  return authed<Automation[]>(base(workspaceId));
}

/** Get a single automation with its last 10 runs. */
export async function getAutomation(workspaceId: string, automationId: string): Promise<Automation> {
  return authed<Automation>(`${base(workspaceId)}/${automationId}`);
}

/** Create a new automation. */
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

/** Update an automation's name or enabled state. */
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

/** Soft-delete an automation. */
export async function deleteAutomation(workspaceId: string, automationId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${automationId}`, { method: 'DELETE' });
}
