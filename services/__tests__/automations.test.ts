/**
 * services/__tests__/automations.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAutomation,
  deleteAutomation,
  getAutomation,
  listAutomationRuns,
  listAutomations,
  retryAutomationRun,
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

function fakeAuto(overrides: Record<string, unknown> = {}) {
  return {
    id: A_ID,
    workspaceId: WS,
    createdById: 'user-1',
    name: 'Notify on task created',
    trigger: 'EVENT_TASK_CREATED',
    condition: null,
    action: 'SEND_NOTIFICATION',
    actionConfig: { userIds: 'user-2', title: 'New task!' },
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

describe('listAutomationRuns', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /workspaces/:wsId/automations/:autoId/runs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await listAutomationRuns(WS, A_ID, { limit: 25 });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations/${A_ID}/runs?limit=25`,
      expect.any(Object),
    );
  });
});

describe('retryAutomationRun', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /runs/:runId/retry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: 'run-1', status: 'PENDING' }));
    await retryAutomationRun(WS, A_ID, 'run-1');
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/automations/${A_ID}/runs/run-1/retry`,
      expect.objectContaining({ method: 'POST' }),
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
      actionConfig: { userIds: 'user-2', title: 'New task!' },
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
