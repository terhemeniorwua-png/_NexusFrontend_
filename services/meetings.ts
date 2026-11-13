/**
 * services/meetings.ts
 *
 * Meeting service for the Nexus meetings module.
 *
 * All routes are at /api/v1/workspaces/:workspaceId/meetings
 * forwarded via /workspaces/:workspaceId/meetings
 *
 * ─── Verified backend contract (2026-11-07) ─────────────────────────────────
 *
 * GET    /workspaces/:wsId/meetings              list — {items, nextCursor}
 *   query: cursor?, limit?, status?, projectId?
 *
 * POST   /workspaces/:wsId/meetings              create — MeetingSummary (201)
 *   body: { title, description?, scheduledAt?, projectId?,
 *           calendarEventId?, participantIds? }
 *
 * GET    /workspaces/:wsId/meetings/:meetingId   get single — MeetingSummary
 *
 * PATCH  /workspaces/:wsId/meetings/:meetingId   update — MeetingSummary
 *   body: { title?, description?, scheduledAt?, status? }
 *
 * DELETE /workspaces/:wsId/meetings/:meetingId   soft-delete — {ok: true}
 *
 * POST   /workspaces/:wsId/meetings/:meetingId/join    join — {ok: true}
 *
 * POST   /workspaces/:wsId/meetings/:meetingId/leave   leave — {ok: true}
 *
 * GET    /workspaces/:wsId/meetings/:meetingId/participants
 *   response: Array<{userId, status, joinedAt, leftAt}>
 *
 * POST   /workspaces/:wsId/meetings/:meetingId/participants
 *   add participant (201) — body: { userId }
 *
 * DELETE /workspaces/:wsId/meetings/:meetingId/participants/:userId
 *   remove participant — {ok: true}
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type ParticipantStatus = 'INVITED' | 'JOINED' | 'LEFT' | 'DECLINED';

export interface MeetingSummary {
  id: string;
  workspaceId: string | null;
  projectId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
}

export interface MeetingParticipant {
  userId: string;
  status: ParticipantStatus;
  joinedAt: string | null;
  leftAt: string | null;
}

export interface ListMeetingsParams {
  cursor?: string;
  limit?: number;
  status?: MeetingStatus;
  projectId?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  projectId?: string | null;
  calendarEventId?: string | null;
  participantIds?: string[];
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string | null;
  scheduledAt?: string | null;
  status?: MeetingStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base(workspaceId: string): string {
  return `/workspaces/${workspaceId}/meetings`;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** List meetings in a workspace with optional status/project filter and cursor pagination. */
export async function listMeetings(
  workspaceId: string,
  params: ListMeetingsParams = {},
): Promise<{ items: MeetingSummary[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  if (params.projectId) q.set('projectId', params.projectId);
  const qs = q.toString();
  return authed<{ items: MeetingSummary[]; nextCursor: string | null }>(
    `${base(workspaceId)}${qs ? `?${qs}` : ''}`,
  );
}

/** Get a single meeting by ID. */
export async function getMeeting(workspaceId: string, meetingId: string): Promise<MeetingSummary> {
  return authed<MeetingSummary>(`${base(workspaceId)}/${meetingId}`);
}

/** Create a new meeting. */
export async function createMeeting(
  workspaceId: string,
  input: CreateMeetingInput,
): Promise<MeetingSummary> {
  return authed<MeetingSummary>(base(workspaceId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** Update a meeting's title, description, scheduledAt, or status. */
export async function updateMeeting(
  workspaceId: string,
  meetingId: string,
  input: UpdateMeetingInput,
): Promise<MeetingSummary> {
  return authed<MeetingSummary>(`${base(workspaceId)}/${meetingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

/** Soft-delete a meeting. */
export async function deleteMeeting(workspaceId: string, meetingId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${meetingId}`, { method: 'DELETE' });
}

/** Join a meeting (upserts the current user as JOINED participant). */
export async function joinMeeting(workspaceId: string, meetingId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${meetingId}/join`, { method: 'POST' });
}

/** Leave a meeting (sets participant status to LEFT). */
export async function leaveMeeting(workspaceId: string, meetingId: string): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${meetingId}/leave`, { method: 'POST' });
}

/** List participants for a meeting. */
export async function listParticipants(
  workspaceId: string,
  meetingId: string,
): Promise<MeetingParticipant[]> {
  return authed<MeetingParticipant[]>(`${base(workspaceId)}/${meetingId}/participants`);
}

/** Add a participant to a meeting by user ID. */
export async function addParticipant(
  workspaceId: string,
  meetingId: string,
  targetUserId: string,
): Promise<{ ok: true }> {
  return authed<{ ok: true }>(`${base(workspaceId)}/${meetingId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: targetUserId }),
  });
}

/** Remove a participant from a meeting. */
export async function removeParticipant(
  workspaceId: string,
  meetingId: string,
  targetUserId: string,
): Promise<{ ok: true }> {
  return authed<{ ok: true }>(
    `${base(workspaceId)}/${meetingId}/participants/${targetUserId}`,
    { method: 'DELETE' },
  );
}

export interface MeetingToken {
  token: string;
  url: string;
  room: string;
}

/**
 * Request a LiveKit access token for a meeting.
 * 403/404: no access, 409: meeting ended or cancelled, 503: calls not configured.
 */
export async function getMeetingToken(workspaceId: string, meetingId: string): Promise<MeetingToken> {
  return authed<MeetingToken>(`${base(workspaceId)}/${meetingId}/token`, { method: 'POST' });
}
