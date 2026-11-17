import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

export type ImportSource = 'CLICKUP' | 'TRELLO' | 'CSV';
export type ImportJobStatus = 'PREVIEWED' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type ImportJobMode = 'DRY_RUN' | 'EXECUTE';

export interface ImportCounts {
  projects: number;
  tasks: number;
  comments: number;
  users: number;
}

export interface ImportPreview {
  counts: ImportCounts;
  warnings: string[];
}

export interface ImportJobSummary {
  id: string;
  workspaceId: string;
  source: ImportSource;
  status: ImportJobStatus;
  mode: ImportJobMode;
  report: ImportPreview;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DryRunInput {
  workspaceId: string;
  source: ImportSource;
  csv?: string;
  apiToken?: string;
  options?: Record<string, unknown>;
}

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

export async function createImportDryRun(input: DryRunInput): Promise<{
  id: string;
  workspaceId: string;
  source: ImportSource;
  status: ImportJobStatus;
  mode: ImportJobMode;
  preview: ImportPreview;
  createdAt: string;
}> {
  return authed('/imports/dry-run', { method: 'POST', body: JSON.stringify(input) });
}

export async function confirmImport(importId: string, idempotencyKey?: string): Promise<ImportJobSummary> {
  return authed(`/imports/${encodeURIComponent(importId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify(idempotencyKey ? { idempotencyKey } : {}),
  });
}

export async function getImportJob(importId: string): Promise<ImportJobSummary> {
  return authed(`/imports/${encodeURIComponent(importId)}`);
}

export async function listImports(workspaceId: string, limit = 20): Promise<ImportJobSummary[]> {
  const q = new URLSearchParams({ workspaceId, limit: String(limit) });
  return authed(`/imports?${q.toString()}`);
}
