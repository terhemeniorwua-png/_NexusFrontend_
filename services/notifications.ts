/**
 * services/notifications.ts
 *
 * Notification preferences service.
 *
 * Backend contract (confirmed in openapi.yaml and API.md):
 *   GET  /workspaces/{workspaceId}/notification-preferences
 *   PATCH /workspaces/{workspaceId}/notification-preferences
 *
 * These preferences control in-app notification delivery only. They do not
 * affect email delivery or message unread state. Message unread counts and
 * general notification unread counts must remain independent at all times.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * BACKEND GAPS (as of 2026-11-07):
 *
 * The general notification feed/inbox is not implemented in the backend.
 * The following APIs do not exist and must not be invented:
 *   - GET  /notifications            (notification list / inbox)
 *   - POST /notifications/:id/read   (mark individual as read)
 *   - POST /notifications/read-all   (mark all as read)
 *   - GET  /notifications/unread-count
 *
 * Socket.IO does not emit notification events in the current backend.
 *
 * Do not connect frontend controls to these absent APIs. Document this as a
 * backend dependency whenever the notification feed UI is referenced.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * All in-app notification types supported by the backend.
 * Source: NotificationType enum in openapi.yaml (18 values).
 */
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

/** All 18 notification type values in display order. */
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

/** Human-readable labels for each notification type. */
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

/** Group labels for logical presentation in the preferences UI. */
export const NOTIFICATION_TYPE_GROUPS: { label: string; types: NotificationType[] }[] = [
  {
    label: 'Tasks',
    types: ['TASK_ASSIGNED', 'TASK_REASSIGNED', 'TASK_SUBMITTED', 'TASK_APPROVED', 'CHANGES_REQUESTED'],
  },
  {
    label: 'Comments and mentions',
    types: ['MENTION', 'COMMENT_REPLY'],
  },
  {
    label: 'Membership',
    types: [
      'MEMBERSHIP_CHANGED',
      'MEMBERSHIP_SUSPENDED',
      'MEMBERSHIP_RESTORED',
      'INVITATION_ACCEPTED',
      'JOIN_REQUEST_RECEIVED',
      'JOIN_REQUEST_APPROVED',
      'JOIN_REQUEST_REJECTED',
    ],
  },
  {
    label: 'Meetings',
    types: ['MEETING_INVITE', 'MEETING_RESCHEDULED', 'MEETING_CANCELLED'],
  },
  {
    label: 'Projects',
    types: ['PROJECT_UPDATE'],
  },
];

export interface NotificationPreference {
  type: NotificationType;
  inAppEnabled: boolean;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * GET /workspaces/{workspaceId}/notification-preferences
 *
 * Returns the caller's preferences for the workspace, including defaults for
 * any types not yet explicitly set. All types default to enabled.
 */
export async function getNotificationPreferences(
  workspaceId: string,
): Promise<NotificationPreference[]> {
  const response = await apiRequest<NotificationPreference[] | Record<string, unknown> | null>(
    `/workspaces/${workspaceId}/notification-preferences`,
  );
  if (Array.isArray(response)) return response;
  if (response !== null && typeof response === 'object' && 'preferences' in response && Array.isArray(response.preferences)) {
    return response.preferences as NotificationPreference[];
  }
  return [];
}

/**
 * PATCH /workspaces/{workspaceId}/notification-preferences
 *
 * Updates selected notification type preferences for the caller in this
 * workspace. Only the supplied types are changed; others remain unchanged.
 * Each notification type may appear at most once in the update.
 */
export async function updateNotificationPreferences(
  workspaceId: string,
  preferences: NotificationPreference[],
): Promise<NotificationPreference[]> {
  const response = await apiRequest<NotificationPreference[] | Record<string, unknown> | null>(
    `/workspaces/${workspaceId}/notification-preferences`,
    {
      method: 'PATCH',
      body: JSON.stringify({ preferences }),
    },
  );
  if (Array.isArray(response)) return response;
  if (response !== null && typeof response === 'object' && 'preferences' in response && Array.isArray(response.preferences)) {
    return response.preferences as NotificationPreference[];
  }
  return [];
}
