/**
 * services/__tests__/audit.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAuditLogs } from '../audit';

const WS = 'ws-audit-test';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('listAuditLogs', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/audit without a query string by default', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listAuditLogs(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/audit`,
      expect.any(Object),
    );
  });

  it('serialises cursor, limit, actorId, action and targetType filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listAuditLogs(WS, {
      cursor: 'cursor-1',
      limit: 50,
      actorId: 'user-1',
      action: 'task',
      targetType: 'Task',
    });
    const url = String(fetchMock.mock.calls[0][0]);
    const query = new URLSearchParams(url.split('?')[1]);
    expect(query.get('cursor')).toBe('cursor-1');
    expect(query.get('limit')).toBe('50');
    expect(query.get('actorId')).toBe('user-1');
    expect(query.get('action')).toBe('task');
    expect(query.get('targetType')).toBe('Task');
  });

  it('returns the parsed page payload', async () => {
    const page = {
      items: [
        {
          id: 'audit-1',
          action: 'TASK_CREATED',
          targetType: 'Task',
          targetId: 'task-1',
          actor: { id: 'user-1', name: 'Ada' },
          metadata: { title: 'Write docs' },
          createdAt: '2026-11-09T10:00:00.000Z',
        },
      ],
      nextCursor: 'next-1',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(page));
    await expect(listAuditLogs(WS)).resolves.toEqual(page);
  });
});
