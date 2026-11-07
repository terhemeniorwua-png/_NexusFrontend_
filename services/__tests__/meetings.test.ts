/**
 * services/__tests__/meetings.test.ts
 *
 * Contract tests for the meetings service — verifies that each function
 * calls the correct backend URL with the correct method and request shape.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addParticipant,
  createMeeting,
  deleteMeeting,
  getMeeting,
  joinMeeting,
  leaveMeeting,
  listMeetings,
  listParticipants,
  removeParticipant,
  updateMeeting,
} from '../meetings';

const WS = 'ws-123';
const M_ID = 'meeting-abc';
const U_ID = 'user-xyz';

function okResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeMeeting(overrides: Partial<{
  id: string; title: string; status: string;
}> = {}) {
  return {
    id: M_ID,
    workspaceId: WS,
    projectId: null,
    createdById: 'user-1',
    title: 'Weekly Sync',
    description: null,
    status: 'SCHEDULED',
    scheduledAt: '2026-11-10T09:00:00.000Z',
    startedAt: null,
    endedAt: null,
    createdAt: '2026-11-07T00:00:00.000Z',
    updatedAt: '2026-11-07T00:00:00.000Z',
    participantCount: 3,
    ...overrides,
  };
}

describe('listMeetings', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/meetings', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ items: [fakeMeeting()], nextCursor: null }),
    );
    await listMeetings(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings`,
      expect.any(Object),
    );
  });

  it('appends status query param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ items: [], nextCursor: null }),
    );
    await listMeetings(WS, { status: 'SCHEDULED' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('status=SCHEDULED'),
      expect.any(Object),
    );
  });

  it('appends projectId query param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ items: [], nextCursor: null }),
    );
    await listMeetings(WS, { projectId: 'proj-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('projectId=proj-1'),
      expect.any(Object),
    );
  });
});

describe('getMeeting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/meetings/:meetingId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse(fakeMeeting()),
    );
    await getMeeting(WS, M_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}`,
      expect.any(Object),
    );
  });
});

describe('createMeeting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/meetings with title and scheduledAt', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse(fakeMeeting(), 201),
    );
    await createMeeting(WS, {
      title: 'Weekly Sync',
      scheduledAt: '2026-11-10T09:00:00.000Z',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"Weekly Sync"'),
      }),
    );
  });

  it('includes participantIds when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse(fakeMeeting(), 201),
    );
    await createMeeting(WS, {
      title: 'Team Meeting',
      participantIds: ['user-a', 'user-b'],
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.participantIds).toEqual(['user-a', 'user-b']);
  });
});

describe('updateMeeting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls PATCH /workspaces/:wsId/meetings/:meetingId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse(fakeMeeting({ status: 'LIVE' })),
    );
    await updateMeeting(WS, M_ID, { status: 'LIVE' });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('deleteMeeting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls DELETE /workspaces/:wsId/meetings/:meetingId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ ok: true }),
    );
    await deleteMeeting(WS, M_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('joinMeeting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/meetings/:meetingId/join', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ ok: true }),
    );
    await joinMeeting(WS, M_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}/join`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('leaveMeeting', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/meetings/:meetingId/leave', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ ok: true }),
    );
    await leaveMeeting(WS, M_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}/leave`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('listParticipants', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/meetings/:meetingId/participants', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse([{ userId: U_ID, status: 'JOINED', joinedAt: null, leftAt: null }]),
    );
    await listParticipants(WS, M_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}/participants`,
      expect.any(Object),
    );
  });
});

describe('addParticipant', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/meetings/:meetingId/participants with userId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ ok: true }, 201),
    );
    await addParticipant(WS, M_ID, U_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}/participants`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: U_ID }),
      }),
    );
  });
});

describe('removeParticipant', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls DELETE /workspaces/:wsId/meetings/:meetingId/participants/:userId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ ok: true }),
    );
    await removeParticipant(WS, M_ID, U_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/meetings/${M_ID}/participants/${U_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
