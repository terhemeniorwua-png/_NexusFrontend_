import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

// ---------------------------------------------------------------------------
// Types — matching backend channel.schemas.ts and channel.service.ts
// ---------------------------------------------------------------------------

export type ChannelType = 'WORKSPACE' | 'TEAM' | 'DEPARTMENT' | 'PROJECT' | 'PRIVATE';

export interface ChannelSummary {
  id: string;
  workspaceId: string;
  type: ChannelType;
  name: string;
  description: string | null;
  teamId: string | null;
  departmentId: string | null;
  projectId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number | null;
}

export interface ChannelPage {
  items: ChannelSummary[];
  nextCursor: string | null;
}

export interface CreateChannelInput {
  type: ChannelType;
  name: string;
  description?: string | null;
  teamId?: string;
  departmentId?: string;
  projectId?: string;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string | null;
}

export interface ChannelMember {
  channelId: string;
  userId: string;
  role: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Internal request helper (same pattern as projects.ts / tasks.ts)
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

const basePath = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/channels`;

const channelPath = (workspaceId: string, channelId: string, suffix = '') =>
  `${basePath(workspaceId)}/${encodeURIComponent(channelId)}${suffix}`;

// ---------------------------------------------------------------------------
// Channel CRUD
// ---------------------------------------------------------------------------

export function listChannels(
  workspaceId: string,
  query: { cursor?: string; limit?: number } = {},
): Promise<ChannelPage> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  return request<ChannelPage>(`${basePath(workspaceId)}${params.size ? `?${params}` : ''}`);
}

export function getChannel(workspaceId: string, channelId: string): Promise<ChannelSummary> {
  return request<ChannelSummary>(channelPath(workspaceId, channelId));
}

export function createChannel(
  workspaceId: string,
  input: CreateChannelInput,
): Promise<ChannelSummary> {
  return request<ChannelSummary>(basePath(workspaceId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateChannel(
  workspaceId: string,
  channelId: string,
  input: UpdateChannelInput,
): Promise<ChannelSummary> {
  return request<ChannelSummary>(channelPath(workspaceId, channelId), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function archiveChannel(
  workspaceId: string,
  channelId: string,
): Promise<ChannelSummary> {
  return request<ChannelSummary>(channelPath(workspaceId, channelId, '/archive'), {
    method: 'POST',
  });
}

export function deleteChannel(
  workspaceId: string,
  channelId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(channelPath(workspaceId, channelId), {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Channel members (private channels only)
// ---------------------------------------------------------------------------

export function addChannelMember(
  workspaceId: string,
  channelId: string,
  userId: string,
): Promise<ChannelMember> {
  return request<ChannelMember>(channelPath(workspaceId, channelId, '/members'), {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeChannelMember(
  workspaceId: string,
  channelId: string,
  userId: string,
): Promise<{ channelId: string; userId: string; removed: true }> {
  return request<{ channelId: string; userId: string; removed: true }>(
    channelPath(workspaceId, channelId, `/members/${encodeURIComponent(userId)}`),
    { method: 'DELETE' },
  );
}
