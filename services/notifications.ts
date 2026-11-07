/**
 * services/notifications.ts
 *
 * In-app notification service.
 *
 * All routes are mounted at /api/v1/notifications in the backend
 * (src/modules/notifications/notification.routes.ts), forwarded through
 * /api/backend/notifications/* by the same-origin proxy.
 *
 * ─── Real backend contract (verified 2026-11-07) ──────────────────────────
 *
 * GET  /notifications               list + unreadCount in response
 *   query: cursor?, limit?, unreadOnly?, type?
 *   response: { items: NotificationSummary[], nextCursor: string|null, unreadCount: number }
 *
 * GET  /notifications/unread-count
 *   response: { unreadCount: number }
 *
 * POST /notifications/read
 *   body: { notificationIds: string[] }   (batch mark-read, min 1 max 100)
 *   response: { ok: true }
 *
 * POST /notifications/read-all
 *   response: { ok: true }
 *
 * GET  /notifications/preferences/:workspaceId
 *   response: Array<{ type: string, inAppEnabled: boolean }>
 *
 * PUT  /notifications/preferences/:workspaceId   (note: PUT not PATCH)
 *   body: { type: NotificationType, inAppEnabled: boolean }  (one type per call)
 *   response: { ok: true }
 *
 * GET  /notifications/activity/:workspaceId
 *   query: cursor?, limit?
 *   response: { items: ActivityEntry[], nextCursor: string|null }
 *
 * ─── Socket.IO ────────────────────────────────────────────────────────────
 * The backend does not currently emit notification-specific socket events.
 * The socket-server only emits: typing:start, typing:stop, presence:online,
 * presence:offline, message:new.  No notification:new event exists.
 *
 * When the backend adds a notification push event, connect it here.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** All 18 notification types supported by the backend. */
export type NotificationType =
  | 'MENTION'
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_SUBMITTED'
  | 'TASK_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'COMMENT_REPLY'
  | 'MEMBERSHIP_CHANGED'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_RESTORED'
  | 'INVITATION_ACCEPTED'
  | 'JOIN_REQUEST_RECEIVED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'MEETING_INVITE'
  | 'MEETING_RESCHEDULED'
  | 'MEETING_CANCELLED'
  | 'PROJECT_UPDATE';

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'MENTION',
  'TASK_ASSIGNED',
  'TASK_REASSIGNED',
  'TASK_SUBMITTED',
  'TASK_APPROVED',
  'CHANGES_REQUESTED',
  'COMMENT_REPLY',
  'MEMBERSHIP_CHANGED',
  'MEMBERSHIP_SUSPENDED',
  'MEMBERSHIP_RESTORED',
  'INVITATION_ACCEPTED',
  'JOIN_REQUEST_RECEIVED',
  'JOIN_REQUEST_APPROVED',
  'JOIN_REQUEST_REJECTED',
  'MEETING_INVITE',
  'MEETING_RESCHEDULED',
  'MEETING_CANCELLED',
  'PROJECT_UPDATE',
];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  MENTION: 'Mentions',
  TASK_ASSIGNED: 'Task assigned to me',
  TASK_REASSIGNED: 'Task reassigned',
  TASK_SUBMITTED: 'Task submitted for review',
  TASK_APPROVED: 'Task approved',
  CHANGES_REQUESTED: 'Changes requested on a task',
  COMMENT_REPLY: 'Replies to my comments',
  MEMBERSHIP_CHANGED: 'My membership changed',
  MEMBERSHIP_SUSPENDED: 'My membership suspended',
  MEMBERSHIP_RESTORED: 'My membership restored',
  INVITATION_ACCEPTED: 'Invitation accepted',
  JOIN_REQUEST_RECEIVED: 'New join request',
  JOIN_REQUEST_APPROVED: 'Join request approved',
  JOIN_REQUEST_REJECTED: 'Join request rejected',
  MEETING_INVITE: 'Meeting invitation',
  MEETING_RESCHEDULED: 'Meeting rescheduled',
  MEETING_CANCELLED: 'Meeting cancelled',
  PROJECT_UPDATE: 'Project updates',
};

export const NOTIFICATION_TYPE_GROUPS: { label: string; types: NotificationType[] }[] = [
  { label: 'Tasks', types: ['TASK_ASSIGNED', 'TASK_REASSIGNED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'CHANGES_REQUESTED'] },
  { label: 'Comments and mentions', types: ['MENTION', 'COMMENT_REPLY'] },
  { label: 'Membership', types: ['MEMBERSHIP_CHANGED', 'MEMBERSHIP_SUSPENDED', 'MEMBERSHIP_RESTORED', 'INVITATION_ACCEPTED', 'JOIN_REQUEST_RECEIVED', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_REJECTED'] },
  { label: 'Meetings', types: ['MEETING_INVITE', 'MEETING_RESCHEDULED', 'MEETING_CANCELLED'] },
  { label: 'Projects', types: ['PROJECT_UPDATE'] },
];

export interface NotificationSummary {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  type: NotificationType;
  inAppEnabled: boolean;
}

export interface ActivityEntry {
  id: string;
  action: string;
  actorId: string | null;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

// ─── Notification list ────────────────────────────────────────────────────────

/**
 * GET /notifications
 * Returns paginated notifications plus the current unread count.
 */
export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<{ items: NotificationSummary[]; nextCursor: string | null; unreadCount: number }> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.unreadOnly) search.set('unreadOnly', 'true');
  if (params.type) search.set('type', params.type);
  const qs = search.toString();
  return authed(`/notifications${qs ? `?${qs}` : ''}`);
}

// ─── Unread count ─────────────────────────────────────────────────────────────

/**
 * GET /notifications/unread-count
 * Returns only the unread count (lighter than loading the full list).
 */
export async function getUnreadCount(): Promise<{ unreadCount: number }> {
  return authed('/notifications/unread-count');
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

/**
 * POST /notifications/read
 * Batch mark specific notifications as read. Min 1, max 100 ids per call.
 */
export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  await authed('/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationIds }),
  });
}

/**
 * POST /notifications/read-all
 * Mark all of the current user's unread notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  await authed('/notifications/read-all', { method: 'POST' });
}

// ─── Preferences ──────────────────────────────────────────────────────────────

/**
 * GET /notifications/preferences/:workspaceId
 * Returns the caller's preferences for the workspace.
 * All types default to inAppEnabled: true when not explicitly set.
 */
export async function getNotificationPreferences(
  workspaceId: string,
): Promise<NotificationPreference[]> {
  const result = await authed<NotificationPreference[] | unknown>(
    `/notifications/preferences/${workspaceId}`,
  );
  return Array.isArray(result) ? (result as NotificationPreference[]) : [];
}

/**
 * PUT /notifications/preferences/:workspaceId
 * Update a single notification type preference for the workspace.
 * The backend accepts one { type, inAppEnabled } per request.
 */
export async function updateNotificationPreference(
  workspaceId: string,
  preference: NotificationPreference,
): Promise<void> {
  await authed(`/notifications/preferences/${workspaceId}`, {
    method: 'PUT',
    body: JSON.stringify({ type: preference.type, inAppEnabled: preference.inAppEnabled }),
  });
}

// ─── Activity feed ────────────────────────────────────────────────────────────

/**
 * GET /notifications/activity/:workspaceId
 * Returns cursor-paginated workspace audit activity.
 */
export async function listActivity(
  workspaceId: string,
  params: { cursor?: string; limit?: number } = {},
): Promise<{ items: ActivityEntry[]; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  return authed(`/notifications/activity/${workspaceId}${qs ? `?${qs}` : ''}`);
}
