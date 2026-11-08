/**
 * services/__tests__/automations.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAutomation,
  deleteAutomation,
  getAutomation,
  listAutomations,
  updateAutomation,
} from '../automations';

const WS = 'ws-auto-test';
const A_ID = 'auto-abc';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeAuto(overrides: Partial<{ id: string; name: string; enabled: boolean }> = {}) {
  return {
    id: A_ID,
    workspaceId: WS,
    createdById: 'user-1',
    name: 'Notify on task created',
    trigger: 'EVENT_TASK_CREATED',
    condition: null,
    action: 'SEND_NOTIFICATION',
    actionConfig: { message: 'New task!' },
    enabled: true,
    maxRetries: 3,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('listAutomations', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/automations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeAuto()]));
    await listAutomations(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations`,
      expect.any(Object),
    );
  });
});

describe('getAutomation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/automations/:autoId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    await getAutomation(WS, A_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations/${A_ID}`,
      expect.any(Object),
    );
  });
});

describe('createAutomation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /workspaces/:wsId/automations with required fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto(), 201));
    await createAutomation(WS, {
      name: 'Notify on task created',
      trigger: 'EVENT_TASK_CREATED',
      action: 'SEND_NOTIFICATION',
      actionConfig: { message: 'New task!' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"Notify on task created"'),
      }),
    );
  });
});

describe('updateAutomation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls PATCH /workspaces/:wsId/automations/:autoId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok(fakeAuto({ enabled: false })),
    );
    await updateAutomation(WS, A_ID, { enabled: false });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations/${A_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('deleteAutomation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls DELETE /workspaces/:wsId/automations/:autoId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteAutomation(WS, A_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations/${A_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
