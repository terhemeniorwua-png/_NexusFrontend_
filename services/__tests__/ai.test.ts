/**
 * services/__tests__/ai.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeText, approveAiAction, queryAI } from '../ai';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('analyzeText', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /ai/analyze with text and features', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ text: 'hello', suggestions: [], message: 'ok' }),
    );
    await analyzeText('hello world', ['GRAMMAR', 'SPELLING']);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/ai/analyze',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"features":["GRAMMAR","SPELLING"]'),
      }),
    );
  });
});

describe('queryAI', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /ai/query with query string', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ query: 'test', answer: null, references: [], message: 'ok' }),
    );
    await queryAI('What is Nexus?');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/ai/query',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"query":"What is Nexus?"'),
      }),
    );
  });

  it('includes workspaceId when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ query: 'test', answer: null, references: [], message: 'ok' }),
    );
    await queryAI('How many tasks?', 'ws-123');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.workspaceId).toBe('ws-123');
  });
});

describe('approveAiAction', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls POST /ai/actions/approve with approval data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ actionType: 'CREATE_TASK', executed: false, message: 'ok' }),
    );
    await approveAiAction({
      workspaceId: 'ws-1',
      actionType: 'CREATE_TASK',
      payload: { title: 'New task' },
      approvedAt: new Date().toISOString(),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/ai/actions/approve',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"actionType":"CREATE_TASK"'),
      }),
    );
  });
});
