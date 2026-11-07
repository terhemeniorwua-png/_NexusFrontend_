import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_GROUPS,
} from '../notifications';

const WORKSPACE_ID = 'ws-abc123';

const mockPreferences = [
  { type: 'MENTION', inAppEnabled: true },
  { type: 'TASK_ASSIGNED', inAppEnabled: false },
];

function makeOkResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeErrorResponse(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('notifications service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Metadata ───────────────────────────────────────────────────────────────

  it('exports all 18 notification types', () => {
    expect(ALL_NOTIFICATION_TYPES).toHaveLength(18);
    expect(ALL_NOTIFICATION_TYPES).toContain('MENTION');
    expect(ALL_NOTIFICATION_TYPES).toContain('PROJECT_UPDATE');
    expect(ALL_NOTIFICATION_TYPES).toContain('MEETING_CANCELLED');
  });

  it('has a human-readable label for every notification type', () => {
    for (const type of ALL_NOTIFICATION_TYPES) {
      expect(NOTIFICATION_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it('groups cover all 18 notification types without duplication', () => {
    const grouped = NOTIFICATION_TYPE_GROUPS.flatMap((g) => g.types);
    expect(grouped).toHaveLength(18);
    const unique = new Set(grouped);
    expect(unique.size).toBe(18);
    for (const type of ALL_NOTIFICATION_TYPES) {
      expect(unique.has(type)).toBe(true);
    }
  });

  // ── getNotificationPreferences ─────────────────────────────────────────────

  it('GET /workspaces/{workspaceId}/notification-preferences — returns array', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeOkResponse(mockPreferences),
    );

    const result = await getNotificationPreferences(WORKSPACE_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WORKSPACE_ID}/notification-preferences`,
      expect.any(Object),
    );
    expect(result).toEqual(mockPreferences);
  });

  it('returns an empty array on unexpected response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(null));
    const result = await getNotificationPreferences(WORKSPACE_ID);
    expect(result).toEqual([]);
  });

  it('throws on 403 access-denied response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeErrorResponse('FORBIDDEN', 'Active workspace membership required.', 403),
    );
    await expect(getNotificationPreferences(WORKSPACE_ID)).rejects.toThrow();
  });

  // ── updateNotificationPreferences ─────────────────────────────────────────

  it('PATCH /workspaces/{workspaceId}/notification-preferences — sends correct body', async () => {
    const updatedPreferences = [
      { type: 'MENTION', inAppEnabled: false },
      { type: 'TASK_ASSIGNED', inAppEnabled: true },
    ];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeOkResponse(updatedPreferences),
    );

    const result = await updateNotificationPreferences(WORKSPACE_ID, [
      { type: 'MENTION', inAppEnabled: false },
      { type: 'TASK_ASSIGNED', inAppEnabled: true },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WORKSPACE_ID}/notification-preferences`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          preferences: [
            { type: 'MENTION', inAppEnabled: false },
            { type: 'TASK_ASSIGNED', inAppEnabled: true },
          ],
        }),
      }),
    );
    expect(result).toEqual(updatedPreferences);
  });

  it('returns the full updated preference set from the backend', async () => {
    const allPrefs = ALL_NOTIFICATION_TYPES.map((type) => ({ type, inAppEnabled: true }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(allPrefs));

    const result = await updateNotificationPreferences(WORKSPACE_ID, [
      { type: 'PROJECT_UPDATE', inAppEnabled: false },
    ]);

    expect(result).toHaveLength(18);
  });

  it('throws on 403 when updating preferences without membership', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeErrorResponse('FORBIDDEN', 'Active workspace membership required.', 403),
    );
    await expect(
      updateNotificationPreferences(WORKSPACE_ID, [{ type: 'MENTION', inAppEnabled: false }]),
    ).rejects.toThrow();
  });
});
