import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

export interface ClarificationUser {
  id: string;
  name: string;
}

export interface TaskClarification {
  id: string;
  taskId: string;
  workspaceId: string;
  projectId: string;
  askedById: string;
  askedBy: ClarificationUser;
  question: string;
  answer: string | null;
  answeredById: string | null;
  answeredBy: ClarificationUser | null;
  askedAt: string;
  answeredAt: string | null;
  cancelledAt: string | null;
  round: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClarificationListResponse {
  items: TaskClarification[];
  nextCursor: string | null;
}

export interface ClarificationActionResponse<TTask = unknown> {
  clarification: TaskClarification;
  task: TTask;
}

function basePath(workspaceId: string, projectId: string, taskId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/clarifications`;
}

export function askClarification<TTask = unknown>(
  workspaceId: string,
  projectId: string,
  taskId: string,
  question: string,
): Promise<ClarificationActionResponse<TTask>> {
  return authed<ClarificationActionResponse<TTask>>(basePath(workspaceId, projectId, taskId), {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export function listClarifications(
  workspaceId: string,
  projectId: string,
  taskId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<ClarificationListResponse> {
  const query = new URLSearchParams();
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const qs = query.toString();
  return authed<ClarificationListResponse>(`${basePath(workspaceId, projectId, taskId)}${qs ? `?${qs}` : ''}`);
}

export function answerClarification<TTask = unknown>(
  workspaceId: string,
  projectId: string,
  taskId: string,
  clarificationId: string,
  answer: string,
): Promise<ClarificationActionResponse<TTask>> {
  return authed<ClarificationActionResponse<TTask>>(
    `${basePath(workspaceId, projectId, taskId)}/${encodeURIComponent(clarificationId)}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ answer }),
    },
  );
}
