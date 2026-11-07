import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  listEventInvitations,
  addEventInvitee,
  removeEventInvitee,
  respondToEventInvitation,
} from '../events';

const WS = 'ws-cal-test';
const EVENT_ID = 'evt-uuid-1';
const USER_ID = 'user-uuid-1';

const fakeEvent = {
  id: EVENT_ID,
  workspaceId: WS,
  projectId: null,
  createdById: USER_ID,
  title: 'Team Standup',
  description: 'Daily sync',
  location: 'Conference Room A',
  startAt: '2026-11-10T09:00:00.000Z',
  endAt: '2026-11-10T09:30:00.000Z',
  allDay: false,
  status: 'CONFIRMED' as const,
  visibility: 'PUBLIC' as const,
  createdAt: '2026-11-07T10:00:00.000Z',
  updatedAt: '2026-11-07T10:00:00.000Z',
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('events service', () => {
  beforeEach(() => vi.restoreAllMocks());

  // ── listEvents ─────────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/events — returns items and nextCursor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeEvent], nextCursor: null }),
    );
    const result = await listEvents(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events`,
      expect.any(Object),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Team Standup');
  });

  it('passes startAfter, startBefore, status, projectId, cursor params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listEvents(WS, {
      startAfter: '2026-11-01T00:00:00.000Z',
      startBefore: '2026-11-30T23:59:59.000Z',
      status: 'CONFIRMED',
      projectId: 'proj-1',
      cursor: 'cursor-abc',
      limit: 10,
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('startAfter=');
    expect(url).toContain('startBefore=');
    expect(url).toContain('status=CONFIRMED');
    expect(url).toContain('projectId=proj-1');
    expect(url).toContain('cursor=cursor-abc');
    expect(url).toContain('limit=10');
  });

  // ── createEvent ────────────────────────────────────────────────────────────

  it('POST /workspaces/:wsId/events — sends event fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeEvent, 201));
    const result = await createEvent(WS, {
      title: 'Team Standup',
      startAt: '2026-11-10T09:00:00.000Z',
      endAt: '2026-11-10T09:30:00.000Z',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Team Standup'),
      }),
    );
    expect(result.id).toBe(EVENT_ID);
  });

  it('includes inviteeIds when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeEvent, 201));
    await createEvent(WS, {
      title: 'All Hands',
      startAt: '2026-11-10T14:00:00.000Z',
      endAt: '2026-11-10T15:00:00.000Z',
      inviteeIds: ['user-a', 'user-b'],
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.inviteeIds).toEqual(['user-a', 'user-b']);
  });

  // ── getEvent ───────────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/events/:eventId — returns event', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeEvent));
    const result = await getEvent(WS, EVENT_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}`,
      expect.any(Object),
    );
    expect(result.title).toBe('Team Standup');
  });

  // ── updateEvent ────────────────────────────────────────────────────────────

  it('PATCH /workspaces/:wsId/events/:eventId — sends changed fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ ...fakeEvent, title: 'Updated Standup' }),
    );
    const result = await updateEvent(WS, EVENT_ID, { title: 'Updated Standup' });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Standup' }),
      }),
    );
    expect(result.title).toBe('Updated Standup');
  });

  // ── cancelEvent ────────────────────────────────────────────────────────────

  it('POST /workspaces/:wsId/events/:eventId/cancel — calls correct endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await cancelEvent(WS, EVENT_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}/cancel`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // ── deleteEvent ────────────────────────────────────────────────────────────

  it('DELETE /workspaces/:wsId/events/:eventId — calls correct endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteEvent(WS, EVENT_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on 403 when deleting without permission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FORBIDDEN', 'Only the creator can delete this event', 403),
    );
    await expect(deleteEvent(WS, EVENT_ID)).rejects.toThrow();
  });

  // ── listEventInvitations ───────────────────────────────────────────────────

  it('GET .../invitations — returns invitation array', async () => {
    const invitations = [{ userId: USER_ID, status: 'ACCEPTED', createdAt: '2026-11-07T10:00:00.000Z' }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(invitations));
    const result = await listEventInvitations(WS, EVENT_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}/invitations`,
      expect.any(Object),
    );
    expect(result[0].status).toBe('ACCEPTED');
  });

  it('returns empty array when invitations response is not an array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(null));
    expect(await listEventInvitations(WS, EVENT_ID)).toEqual([]);
  });

  // ── addEventInvitee ────────────────────────────────────────────────────────

  it('POST .../invitations — sends userId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }, 201));
    await addEventInvitee(WS, EVENT_ID, USER_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}/invitations`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: USER_ID }),
      }),
    );
  });

  // ── removeEventInvitee ─────────────────────────────────────────────────────

  it('DELETE .../invitations/:userId — calls correct endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await removeEventInvitee(WS, EVENT_ID, USER_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}/invitations/${USER_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  // ── respondToEventInvitation ───────────────────────────────────────────────

  it('POST .../respond — sends ACCEPTED status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await respondToEventInvitation(WS, EVENT_ID, 'ACCEPTED');
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/events/${EVENT_ID}/respond`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      }),
    );
  });

  it('POST .../respond — sends DECLINED status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await respondToEventInvitation(WS, EVENT_ID, 'DECLINED');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.status).toBe('DECLINED');
  });
});
