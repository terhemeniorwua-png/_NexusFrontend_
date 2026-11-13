import { apiRawRequest, apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

// ---------------------------------------------------------------------------
// Types — matching backend message.schemas.ts and message.service.ts
// ---------------------------------------------------------------------------

export interface MessageSummary {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  body: string;
  parentId: string | null;
  editedAt: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  replyCount: number;
  reactionCount: number;
  type?: 'TEXT' | 'VOICE';
  audioMime?: string | null;
  audioDurationMs?: number | null;
}

export interface MessagePage {
  items: MessageSummary[];
  nextCursor: string | null;
}

export interface SendMessageInput {
  body: string;
  parentId?: string | null;
}

export interface ListMessagesQuery {
  cursor?: string;
  limit?: number;
  includeDeleted?: boolean;
}

// ---------------------------------------------------------------------------
// Internal request helper
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

const channelPath = (workspaceId: string, channelId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/channels/${encodeURIComponent(channelId)}${suffix}`;

const messagePath = (workspaceId: string, channelId: string, messageId: string, suffix = '') =>
  `${channelPath(workspaceId, channelId)}/messages/${encodeURIComponent(messageId)}${suffix}`;

// ---------------------------------------------------------------------------
// Message list / send
// ---------------------------------------------------------------------------

export function listMessages(
  workspaceId: string,
  channelId: string,
  query: ListMessagesQuery = {},
): Promise<MessagePage> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.includeDeleted) params.set('includeDeleted', 'true');
  return request<MessagePage>(`${channelPath(workspaceId, channelId)}/messages${params.size ? `?${params}` : ''}`);
}

export function sendMessage(
  workspaceId: string,
  channelId: string,
  input: SendMessageInput,
): Promise<MessageSummary> {
  return request<MessageSummary>(channelPath(workspaceId, channelId, '/messages'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getReplies(
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<MessageSummary[]> {
  return request<MessageSummary[]>(messagePath(workspaceId, channelId, messageId, '/replies'));
}

// ---------------------------------------------------------------------------
// Message edit / delete
// ---------------------------------------------------------------------------

export function editMessage(
  workspaceId: string,
  channelId: string,
  messageId: string,
  body: string,
): Promise<MessageSummary> {
  return request<MessageSummary>(messagePath(workspaceId, channelId, messageId), {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

export function deleteMessage(
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<{ ok: true }> {
  return request<{ ok: true }>(messagePath(workspaceId, channelId, messageId), {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Pin / unpin
// ---------------------------------------------------------------------------

export function pinMessage(
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<MessageSummary> {
  return request<MessageSummary>(messagePath(workspaceId, channelId, messageId, '/pin'), {
    method: 'POST',
  });
}

export function unpinMessage(
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<MessageSummary> {
  return request<MessageSummary>(messagePath(workspaceId, channelId, messageId, '/unpin'), {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export function addReaction(
  workspaceId: string,
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<MessageSummary> {
  return request<MessageSummary>(messagePath(workspaceId, channelId, messageId, '/reactions'), {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export function removeReaction(
  workspaceId: string,
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<{ ok: true }> {
  const params = new URLSearchParams({ emoji });
  return request<{ ok: true }>(
    `${messagePath(workspaceId, channelId, messageId, '/reactions')}?${params}`,
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Read status / unread count
// ---------------------------------------------------------------------------

export function markMessageRead(
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<{ ok: true }> {
  return request<{ ok: true }>(messagePath(workspaceId, channelId, messageId, '/read'), {
    method: 'POST',
  });
}

export function getUnreadCount(
  workspaceId: string,
  channelId: string,
): Promise<{ unreadCount: number }> {
  return request<{ unreadCount: number }>(
    channelPath(workspaceId, channelId, '/unread-count'),
  );
}

export function sendVoiceMessage(
  workspaceId: string,
  channelId: string,
  audio: Blob,
  durationMs: number,
): Promise<MessageSummary> {
  const form = new FormData();
  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', audio, `voice.${ext}`);
  form.append('durationMs', String(Math.round(durationMs)));
  return request<MessageSummary>(`${channelPath(workspaceId, channelId)}/voice`, { method: 'POST', body: form });
}

export async function fetchVoiceAudio(
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<Blob> {
  const response = await apiRawRequest(messagePath(workspaceId, channelId, messageId, '/audio'), { authenticated: true });
  if (!response.ok) throw new ApiRequestError('Voice message could not be loaded.', response.status);
  return response.blob();
}
