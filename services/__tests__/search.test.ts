/**
 * services/__tests__/search.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { globalSearch } from '../search';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeResult(type = 'project') {
  return {
    id: 'result-1',
    type,
    title: 'My Project',
    description: 'A project',
    workspaceId: 'ws-1',
    createdAt: new Date().toISOString(),
  };
}

describe('globalSearch', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calls GET /search with required q param', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeResult()]));
    await globalSearch({ q: 'nexus' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/backend/search?q=nexus'),
      expect.any(Object),
    );
  });

  it('appends category param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await globalSearch({ q: 'test', category: 'projects' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('category=projects'),
      expect.any(Object),
    );
  });

  it('appends workspaceId param when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await globalSearch({ q: 'task', workspaceId: 'ws-abc' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('workspaceId=ws-abc'),
      expect.any(Object),
    );
  });

  it('does not append category param for all', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await globalSearch({ q: 'test', category: 'all' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain('category');
  });

  it('returns array of search results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([fakeResult('task'), fakeResult('file')]));
    const results = await globalSearch({ q: 'doc' });
    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('task');
  });
});
