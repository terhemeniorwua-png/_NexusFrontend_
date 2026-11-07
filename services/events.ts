/**
 * services/events.ts
 *
 * Calendar event service.
 *
 * All routes are at /api/v1/workspaces/:workspaceId/events
 * forwarded via /api/backend/workspaces/:workspaceId/events
 *
 * ─── Verified backend contract (2026-11-07) ─────────────────────────────────
 *
 * GET    /workspaces/:wsId/events              list — {items, nextCursor}
 *   query: cursor?, limit?, startAfter?, startBefore?, projectId?, status?
 *
 * POST   /workspaces/:wsId/events              create — EventSummary (201)
 *   body: { title, description?, location?, startAt, endAt, allDay?,
 *           status?, visibility?, projectId?, inviteeIds? }
 *
 * GET    /workspaces/:wsId/events/:eventId     get single — EventSummary
 *
 * PATCH  /workspaces/:wsId/events/:eventId     update — EventSummary
 *   body: any subset of create fields (except inviteeIds)
 *
 * POST   /workspaces/:wsId/events/:eventId/cancel    cancel — {ok: true}
 *
 * DELETE /workspaces/:wsId/events/:eventId     soft-delete — {ok: true}
 *
 * GET    /workspaces/:wsId/events/:eventId/invitations
 *   response: Array<{userId, status, createdAt}>
 *
 * POST   /workspaces/:wsId/events/:eventId/invitations  add invitee (201)
 *   body: { userId }
 *
 * DELETE /workspaces/:wsId/events/:eventId/invitations/:userId  remove invitee
 *
 * POST   /workspaces/:wsId/events/:eventId/respond   respond to invitation
 *   body: { status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
export type EventVisibility = 'PUBLIC' | 'PRIVATE';
export type InvitationStatus = 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'PENDING';

export interface EventSummary {
  id: string;
  workspaceId: string | null;
  projectId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: EventStatus;
  visibility: EventVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface EventInvitation {
  userId: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface ListEventsParams {
  cursor?: string;
  limit?: number;
  startAfter?: string;
  startBefore?: string;
  projectId?: string;
  status?: EventStatus;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  status?: EventStatus;
  visibility?: EventVisibility;
  projectId?: string | null;
  inviteeIds?: string[];
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  status?: EventStatus;
  visibility?: EventVisibility;
  projectId?: string | null;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listEvents(
  workspaceId: string,
  params: ListEventsParams = {},
): Promise<{ items: EventSummary[]; nextCursor: string | null }> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.startAfter) search.set('startAfter', params.startAfter);
  if (params.startBefore) search.set('startBefore', params.startBefore);
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  return authed(`/workspaces/${workspaceId}/events${qs ? `?${qs}` : ''}`);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createEvent(
  workspaceId: string,
  input: CreateEventInput,
): Promise<EventSummary> {
  return authed(`/workspaces/${workspaceId}/events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getEvent(
  workspaceId: string,
  eventId: string,
): Promise<EventSummary> {
  return authed(`/workspaces/${workspaceId}/events/${eventId}`);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEvent(
  workspaceId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<EventSummary> {
  return authed(`/workspaces/${workspaceId}/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelEvent(
  workspaceId: string,
  eventId: string,
): Promise<void> {
  await authed(`/workspaces/${workspaceId}/events/${eventId}/cancel`, {
    method: 'POST',
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteEvent(
  workspaceId: string,
  eventId: string,
): Promise<void> {
  await authed(`/workspaces/${workspaceId}/events/${eventId}`, {
    method: 'DELETE',
  });
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function listEventInvitations(
  workspaceId: string,
  eventId: string,
): Promise<EventInvitation[]> {
  const result = await authed<EventInvitation[] | unknown>(
    `/workspaces/${workspaceId}/events/${eventId}/invitations`,
  );
  return Array.isArray(result) ? (result as EventInvitation[]) : [];
}

export async function addEventInvitee(
  workspaceId: string,
  eventId: string,
  userId: string,
): Promise<void> {
  await authed(`/workspaces/${workspaceId}/events/${eventId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function removeEventInvitee(
  workspaceId: string,
  eventId: string,
  userId: string,
): Promise<void> {
  await authed(
    `/workspaces/${workspaceId}/events/${eventId}/invitations/${userId}`,
    { method: 'DELETE' },
  );
}

export async function respondToEventInvitation(
  workspaceId: string,
  eventId: string,
  status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE',
): Promise<void> {
  await authed(`/workspaces/${workspaceId}/events/${eventId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
