import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import { createPrivacyRequest, getMyPrivacyRequest, listMyPrivacyRequests } from '../privacy-requests';

function response(data: unknown): Response { return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }

describe('privacy request service', () => {
  beforeEach(() => { setAccessToken('test-token'); vi.restoreAllMocks(); });
  it('submits the documented privacy-request body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ id: 'request-1' }));
    const input = { type: 'ACCESS' as const, description: 'Copy of my data' };
    await createPrivacyRequest(input);
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/privacy-requests', expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }));
  });
  it('lists own requests with supported filters and loads own detail', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response([])).mockResolvedValueOnce(response({ id: 'request-1' }));
    await listMyPrivacyRequests({ limit: 20, status: 'SUBMITTED' });
    await getMyPrivacyRequest('request-1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/privacy-requests/mine?limit=20&status=SUBMITTED', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/privacy-requests/mine/request-1', expect.any(Object));
  });
});
